import logging
import signal
import time
from concurrent.futures import ThreadPoolExecutor
from threading import Event, RLock, Thread
from typing import Any

from app.config import settings
from app.evaluator import evaluate_rule
from app.models import AlertContext
from app.mqtt_client import MQTTClient
from app.notifier import NotificationService
from app.rule_store import AlertRuleStore


logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)
NO_DATA_OPERATOR = "no data"
MISSING_DATA_CHECK_INTERVAL_SECONDS = 1


class AlertService:
    def __init__(self) -> None:
        self._stop = Event()
        self._executor = ThreadPoolExecutor(max_workers=settings.ALERT_WORKERS)
        self._rule_store = AlertRuleStore()
        self._notifier = NotificationService()
        self._cooldown_lock = RLock()
        self._last_sent_at: dict[int, float] = {}
        self._missing_lock = RLock()
        self._missing_last_seen_at: dict[int, float] = {}
        self._missing_rule_signature: dict[int, tuple[str, str, str]] = {}
        self._missing_pending: set[int] = set()
        self._missing_monitor: Thread | None = None
        self._mqtt = MQTTClient(
            on_processed_message=self._handle_processed_message,
            on_rule_message=self._handle_rule_message,
        )

    def run(self) -> None:
        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)

        logger.info("Starting alert service")
        self._rule_store.load_all()
        self._sync_missing_rule_state()
        self._missing_monitor = Thread(target=self._monitor_missing_data, daemon=True)
        self._missing_monitor.start()

        try:
            self._mqtt.connect()
            self._mqtt.loop_forever()
        finally:
            self._stop.set()
            if self._missing_monitor:
                self._missing_monitor.join(timeout=MISSING_DATA_CHECK_INTERVAL_SECONDS + 1)
            self._executor.shutdown(wait=True)
            self._mqtt.disconnect()
            logger.info("Alert service stopped")

    def _handle_shutdown(self, _signum, _frame) -> None:
        logger.info("Shutdown requested")
        self._stop.set()
        self._mqtt.disconnect()

    def _handle_processed_message(self, topic: str, payload: dict[str, Any]) -> None:
        uid = self._extract_uid_from_topic(topic)
        data = payload.get("data")
        if uid and isinstance(data, dict):
            now = time.monotonic()
            with self._missing_lock:
                for rule in self._rule_store.get_rules_for_uid(uid):
                    if rule.operator == NO_DATA_OPERATOR and rule.field in data:
                        self._missing_last_seen_at[rule.id] = now
        self._executor.submit(self._process_device_data, topic, payload)

    def _handle_rule_message(self, _topic: str, payload: dict[str, Any]) -> None:
        self._executor.submit(self._process_rule_change, payload)

    def _process_rule_change(self, payload: dict[str, Any]) -> None:
        device_id = payload.get("device_id")
        action = payload.get("action")
        if device_id is None:
            logger.warning("Ignoring alert-rule event without device_id: %s", payload)
            return

        try:
            parsed_device_id = int(device_id)
        except (TypeError, ValueError):
            logger.warning("Ignoring alert-rule event with invalid device_id: %s", payload)
            return

        self._rule_store.reload_device(parsed_device_id)
        self._sync_missing_rule_state()
        logger.debug("Processed alert-rule %s event for device_id=%s", action, parsed_device_id)

    def _process_device_data(self, topic: str, payload: dict[str, Any]) -> None:
        uid = self._extract_uid_from_topic(topic)
        if not uid:
            logger.warning("Unable to determine device UID from topic: %s", topic)
            return

        data = payload.get("data")
        if not isinstance(data, dict):
            logger.warning("Ignoring processed payload without data object for uid=%s", uid)
            return

        rules = self._rule_store.get_rules_for_uid(uid)
        if not rules:
            return

        for rule in rules:
            if rule.operator == NO_DATA_OPERATOR:
                continue
            matched, actual_value = evaluate_rule(rule, data)
            if not matched or not self._cooldown_allows(rule.id, rule.cooldown_seconds):
                continue

            self._notifier.notify(
                AlertContext(
                    rule=rule,
                    actual_value=actual_value,
                    payload=payload,
                )
            )

    def _sync_missing_rule_state(self) -> None:
        now = time.monotonic()
        current_rules = {
            rule.id: rule
            for rule in self._rule_store.get_all_rules()
            if rule.operator == NO_DATA_OPERATOR
        }
        with self._missing_lock:
            removed_ids = self._missing_rule_signature.keys() - current_rules.keys()
            for rule_id in removed_ids:
                self._missing_rule_signature.pop(rule_id, None)
                self._missing_last_seen_at.pop(rule_id, None)
                self._missing_pending.discard(rule_id)

            for rule_id, rule in current_rules.items():
                signature = (rule.device_uid, rule.field, str(rule.value))
                if self._missing_rule_signature.get(rule_id) != signature:
                    self._missing_rule_signature[rule_id] = signature
                    self._missing_last_seen_at[rule_id] = now
                    self._missing_pending.discard(rule_id)

    def _monitor_missing_data(self) -> None:
        while not self._stop.wait(MISSING_DATA_CHECK_INTERVAL_SECONDS):
            now = time.monotonic()
            for rule in self._rule_store.get_all_rules():
                if rule.operator != NO_DATA_OPERATOR:
                    continue
                timeout_seconds = self._get_missing_timeout_seconds(rule)
                if timeout_seconds is None:
                    logger.warning("Invalid no-data timeout for alert rule_id=%s: %r", rule.id, rule.value)
                    continue

                with self._missing_lock:
                    last_seen_at = self._missing_last_seen_at.setdefault(rule.id, now)
                    if now - last_seen_at < timeout_seconds or rule.id in self._missing_pending:
                        continue
                    self._missing_pending.add(rule.id)

                self._executor.submit(self._notify_if_still_missing, rule, last_seen_at, timeout_seconds)

    def _notify_if_still_missing(self, rule, last_seen_at: float, timeout_seconds: int) -> None:
        try:
            now = time.monotonic()
            with self._missing_lock:
                signature = (rule.device_uid, rule.field, str(rule.value))
                if (
                    self._missing_rule_signature.get(rule.id) != signature
                    or self._missing_last_seen_at.get(rule.id) != last_seen_at
                    or now - last_seen_at < timeout_seconds
                ):
                    return

            if not self._cooldown_allows(rule.id, rule.cooldown_seconds):
                return

            from datetime import datetime, timezone

            self._notifier.notify(
                AlertContext(
                    rule=rule,
                    actual_value=f"No data received for {timeout_seconds} seconds",
                    payload={
                        "ts": datetime.now(timezone.utc).isoformat(),
                        "data": {},
                        "alert_reason": NO_DATA_OPERATOR,
                        "timeout_seconds": timeout_seconds,
                    },
                )
            )
        finally:
            with self._missing_lock:
                self._missing_pending.discard(rule.id)

    @staticmethod
    def _get_missing_timeout_seconds(rule) -> int | None:
        value = rule.value
        if isinstance(value, bool) or not isinstance(value, (int, float)):
            return None
        if value <= 0 or int(value) != value:
            return None
        return int(value)

    def _cooldown_allows(self, rule_id: int, cooldown_seconds: int) -> bool:
        now = time.monotonic()
        with self._cooldown_lock:
            last_sent_at = self._last_sent_at.get(rule_id)
            if last_sent_at is not None and now - last_sent_at < cooldown_seconds:
                return False
            self._last_sent_at[rule_id] = now
            return True

    def _extract_uid_from_topic(self, topic: str) -> str | None:
        parts = [part for part in topic.strip("/").split("/") if part]
        if len(parts) < 4:
            return None
        if parts[:3] != ["internal", "devices", "processed"]:
            return None
        return parts[-1]
