import logging
import signal
import time
from concurrent.futures import ThreadPoolExecutor
from threading import Event, RLock
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


class AlertService:
    def __init__(self) -> None:
        self._stop = Event()
        self._executor = ThreadPoolExecutor(max_workers=settings.ALERT_WORKERS)
        self._rule_store = AlertRuleStore()
        self._notifier = NotificationService()
        self._cooldown_lock = RLock()
        self._last_sent_at: dict[int, float] = {}
        self._mqtt = MQTTClient(
            on_processed_message=self._handle_processed_message,
            on_rule_message=self._handle_rule_message,
        )

    def run(self) -> None:
        signal.signal(signal.SIGINT, self._handle_shutdown)
        signal.signal(signal.SIGTERM, self._handle_shutdown)

        logger.info("Starting alert service")
        self._rule_store.load_all()
        self._mqtt.connect()

        try:
            self._mqtt.loop_forever()
        finally:
            self._executor.shutdown(wait=True)
            self._mqtt.disconnect()
            logger.info("Alert service stopped")

    def _handle_shutdown(self, _signum, _frame) -> None:
        logger.info("Shutdown requested")
        self._stop.set()
        self._mqtt.disconnect()

    def _handle_processed_message(self, topic: str, payload: dict[str, Any]) -> None:
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
