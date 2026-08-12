import json
import math
import threading
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, Optional, Tuple

from app.core.config import settings
from app.core.mongo import get_rollup_hour_collection, get_rollup_min_collection
from app.core.postgresql import SessionLocal
from app.models.device import Device
from app.utils.logger import logger


@dataclass(frozen=True)
class DeviceRollupConfig:
    uid: str
    is_active: bool
    field_types: Dict[str, str]


class DeviceConfigRepository:
    def fetch_all(self) -> Dict[str, DeviceRollupConfig]:
        session = SessionLocal()
        try:
            rows = session.query(Device.uid, Device.is_active, Device.dashboard_config).all()
        finally:
            session.close()

        return {
            uid: DeviceRollupConfig(
                uid=uid,
                is_active=bool(is_active),
                field_types=extract_data_panel_schema(dashboard_config),
            )
            for uid, is_active, dashboard_config in rows
        }

    def fetch_by_uid(self, uid: str) -> Optional[DeviceRollupConfig]:
        session = SessionLocal()
        try:
            row = (
                session.query(Device.uid, Device.is_active, Device.dashboard_config)
                .filter(Device.uid == uid)
                .first()
            )
        finally:
            session.close()

        if not row:
            return None
        device_uid, is_active, dashboard_config = row
        return DeviceRollupConfig(
            uid=device_uid,
            is_active=bool(is_active),
            field_types=extract_data_panel_schema(dashboard_config),
        )


class RollupService:
    def __init__(self, mqtt_client):
        self._mqtt_client = mqtt_client
        self._repository = DeviceConfigRepository()
        self._configs: Dict[str, DeviceRollupConfig] = {}
        self._config_lock = threading.Lock()
        self._rollup_min_collection = get_rollup_min_collection()
        self._rollup_hour_collection = get_rollup_hour_collection()

    def handle_mqtt_connect(self, *_args, **_kwargs) -> None:
        self.refresh_all_configs()
        self._mqtt_client.message_callback_add(settings.MQTT_DEVICE_PROCESSED_TOPIC, self.handle_processed_message)
        self._mqtt_client.message_callback_add(settings.MQTT_DEVICE_EVENT_TOPIC, self.handle_event_message)
        self._mqtt_client.subscribe(settings.MQTT_DEVICE_PROCESSED_TOPIC)
        self._mqtt_client.subscribe(settings.MQTT_DEVICE_EVENT_TOPIC)

    def refresh_all_configs(self) -> None:
        configs = self._repository.fetch_all()
        with self._config_lock:
            self._configs = configs
        logger.info("Loaded rollup config for %s devices", len(configs))

    def refresh_device_config(self, device_uid: str) -> None:
        config = self._repository.fetch_by_uid(device_uid)
        with self._config_lock:
            if config and config.is_active:
                self._configs[device_uid] = config
                logger.info("Refreshed rollup config for device %s", device_uid)
            else:
                self._configs.pop(device_uid, None)
                logger.info("Removed rollup config for inactive/missing device %s", device_uid)

    def handle_event_message(self, _client, _userdata, msg) -> None:
        payload = _parse_json_payload(msg.payload)
        if not isinstance(payload, dict):
            logger.warning("Device event payload is not a JSON object")
            return

        event_type = str(payload.get("event_type", "")).lower()
        device_uid = payload.get("uid")
        if not event_type or not device_uid:
            logger.warning("Device event missing event_type or uid")
            return

        if event_type == "delete":
            with self._config_lock:
                self._configs.pop(device_uid, None)
            logger.info("Removed rollup config for deleted device %s", device_uid)
            return

        if event_type == "add":
            self.refresh_device_config(str(device_uid))
            return

        if event_type == "update" and payload.get("restart_pipeline"):
            self.refresh_device_config(str(device_uid))

    def handle_processed_message(self, _client, _userdata, msg) -> None:
        payload = _parse_json_payload(msg.payload)
        if not isinstance(payload, dict):
            logger.warning("Processed payload is not a JSON object")
            return

        device_id = payload.get("device_id")
        if not device_id:
            device_id = _device_uid_from_processed_topic(msg.topic)
        if not device_id:
            logger.warning("Processed payload missing device_id")
            return

        timestamp = _coerce_datetime(payload.get("ts"))
        if not timestamp:
            logger.warning("Processed payload missing valid ts for device %s", device_id)
            return

        data = payload.get("data")
        if not isinstance(data, dict):
            logger.warning("Processed payload missing data object for device %s", device_id)
            return

        config = self._get_or_load_config(str(device_id))
        if not config or not config.is_active or not config.field_types:
            return

        filtered_data = {
            key: value
            for key, value in data.items()
            if key in config.field_types and value is not None
        }
        if not filtered_data:
            return

        self._update_rollup(
            self._rollup_min_collection,
            str(device_id),
            timestamp,
            timestamp.replace(second=0, microsecond=0),
            filtered_data,
            config.field_types,
        )
        self._update_rollup(
            self._rollup_hour_collection,
            str(device_id),
            timestamp,
            timestamp.replace(minute=0, second=0, microsecond=0),
            filtered_data,
            config.field_types,
        )

    def _get_or_load_config(self, device_uid: str) -> Optional[DeviceRollupConfig]:
        with self._config_lock:
            config = self._configs.get(device_uid)
        if config is not None:
            return config
        self.refresh_device_config(device_uid)
        with self._config_lock:
            return self._configs.get(device_uid)

    def _update_rollup(
        self,
        collection,
        device_id: str,
        timestamp: datetime,
        bucket_ts: datetime,
        data: Dict[str, Any],
        field_types: Dict[str, str],
    ) -> None:
        inc_ops: Dict[str, int | float] = {}
        set_ops: Dict[str, Any] = {}
        max_ops: Dict[str, Any] = {}
        min_ops: Dict[str, Any] = {}
        existing_doc = collection.find_one(
            {"device_id": device_id, "ts": bucket_ts},
            {
                "_id": 0,
                "meta.num_last_ts": 1,
            },
        ) or {}
        existing_meta = existing_doc.get("meta") if isinstance(existing_doc.get("meta"), dict) else {}

        def is_latest_numeric_sample(field: str) -> bool:
            last_ts = (existing_meta.get("num_last_ts") or {}).get(field)
            if not isinstance(last_ts, datetime):
                return True
            normalized_last_ts = (
                last_ts.replace(tzinfo=timezone.utc)
                if last_ts.tzinfo is None or last_ts.tzinfo.utcoffset(last_ts) is None
                else last_ts.astimezone(timezone.utc)
            )
            return timestamp >= normalized_last_ts

        for key, value in data.items():
            ftype = normalize_field_type(field_types.get(key))

            if ftype == "list":
                set_ops[f"data.{key}"] = value
                set_ops[f"meta.list_last_value.{key}"] = value
                max_ops[f"meta.list_last_ts.{key}"] = timestamp
                inc_ops[f"meta.value_count.{key}"] = inc_ops.get(f"meta.value_count.{key}", 0) + 1
                for item_key, inc in _iter_list_counts(value):
                    safe_item = _sanitize_key(item_key)
                    inc_ops[f"meta.element_frequency.{key}.{safe_item}"] = (
                        inc_ops.get(f"meta.element_frequency.{key}.{safe_item}", 0) + inc
                    )
                continue

            if ftype == "boolean":
                bool_value = _coerce_bool(value)
                if bool_value is None:
                    continue
                set_ops[f"data.{key}"] = bool_value
                set_ops[f"meta.last_value.{key}"] = bool_value
                max_ops[f"meta.text_last_ts.{key}"] = timestamp
                inc_ops[f"meta.value_count.{key}"] = inc_ops.get(f"meta.value_count.{key}", 0) + 1
                state = "true" if bool_value else "false"
                inc_ops[f"meta.value_state_count.{key}.{state}"] = (
                    inc_ops.get(f"meta.value_state_count.{key}.{state}", 0) + 1
                )
                inc_ops[f"meta.boolean_true_count.{key}"] = (
                    inc_ops.get(f"meta.boolean_true_count.{key}", 0) + (1 if bool_value else 0)
                )
                inc_ops[f"meta.boolean_false_count.{key}"] = (
                    inc_ops.get(f"meta.boolean_false_count.{key}", 0) + (0 if bool_value else 1)
                )
                continue

            if ftype == "number":
                numeric_value = _coerce_number(value)
                inc_ops[f"meta.value_count.{key}"] = inc_ops.get(f"meta.value_count.{key}", 0) + 1
                if numeric_value is None:
                    continue
                inc_ops[f"meta.num_sum.{key}"] = inc_ops.get(f"meta.num_sum.{key}", 0.0) + numeric_value
                inc_ops[f"meta.num_count.{key}"] = inc_ops.get(f"meta.num_count.{key}", 0) + 1
                min_ops[f"meta.num_min.{key}"] = numeric_value
                max_ops[f"meta.num_max.{key}"] = numeric_value
                if is_latest_numeric_sample(key):
                    set_ops[f"data.{key}"] = numeric_value
                    set_ops[f"meta.num_last_value.{key}"] = numeric_value
                max_ops[f"meta.num_last_ts.{key}"] = timestamp
                continue

            set_ops[f"data.{key}"] = value
            set_ops[f"meta.last_value.{key}"] = value
            max_ops[f"meta.text_last_ts.{key}"] = timestamp
            inc_ops[f"meta.value_count.{key}"] = inc_ops.get(f"meta.value_count.{key}", 0) + 1
            state_key = _sanitize_key(value)
            inc_ops[f"meta.value_state_count.{key}.{state_key}"] = (
                inc_ops.get(f"meta.value_state_count.{key}.{state_key}", 0) + 1
            )

        if not (inc_ops or set_ops or max_ops or min_ops):
            return

        update_doc: Dict[str, Any] = {
            "$setOnInsert": {
                "device_id": device_id,
                "ts": bucket_ts,
            }
        }
        if inc_ops:
            update_doc["$inc"] = inc_ops
        if set_ops:
            update_doc["$set"] = set_ops
        if max_ops:
            update_doc["$max"] = max_ops
        if min_ops:
            update_doc["$min"] = min_ops

        collection.update_one(
            {"device_id": device_id, "ts": bucket_ts},
            update_doc,
            upsert=True,
        )
        self._sync_numeric_snapshots(collection, device_id, bucket_ts, field_types)

    def _sync_numeric_snapshots(self, collection, device_id: str, bucket_ts: datetime, field_types: Dict[str, str]) -> None:
        numeric_fields = [
            field
            for field, ftype in field_types.items()
            if normalize_field_type(ftype) == "number"
        ]
        if not numeric_fields:
            return

        set_stage: Dict[str, Any] = {}
        for field in numeric_fields:
            avg_expr = {
                "$cond": [
                    {"$gt": [f"$meta.num_count.{field}", 0]},
                    {"$divide": [f"$meta.num_sum.{field}", f"$meta.num_count.{field}"]},
                    "$$REMOVE",
                ]
            }
            set_stage[f"meta.num_avg.{field}"] = avg_expr

        collection.update_one(
            {"device_id": device_id, "ts": bucket_ts},
            [{"$set": set_stage}],
        )


def extract_data_panel_schema(dashboard_config: Any) -> Dict[str, str]:
    if not isinstance(dashboard_config, dict):
        return {}

    if "data_panel" in dashboard_config:
        data_panel = dashboard_config.get("data_panel")
        if not isinstance(data_panel, dict):
            return {}
        fields = data_panel.get("fields", [])
        config = data_panel.get("config", {})
    else:
        fields = dashboard_config.get("data_panel_fields", [])
        config = dashboard_config.get("data_panel_config", {})

    if not isinstance(fields, list) or not isinstance(config, dict):
        return {}

    field_types: Dict[str, str] = {}
    for key in fields:
        if not isinstance(key, str) or not key.strip():
            continue
        cfg = config.get(key, {})
        raw_type = cfg.get("type") if isinstance(cfg, dict) else None
        field_types[key.strip()] = normalize_field_type(raw_type)
    return field_types


def normalize_field_type(value: Any) -> str:
    if not isinstance(value, str):
        return "text"
    normalized = value.strip().lower()
    if normalized in {"boolean", "bool"}:
        return "boolean"
    if normalized in {"list", "array"}:
        return "list"
    if normalized in {"number", "numeric", "float", "int"}:
        return "number"
    return "text"


def _parse_json_payload(payload: bytes) -> Any:
    try:
        return json.loads(payload.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError):
        return None


def _device_uid_from_processed_topic(topic: str) -> Optional[str]:
    parts = [part for part in topic.strip("/").split("/") if part]
    if len(parts) < 5 or parts[:3] != ["internal", "devices", "processed"]:
        return None
    return parts[-1]


def _coerce_datetime(value: Any) -> Optional[datetime]:
    if isinstance(value, datetime):
        parsed = value
    elif isinstance(value, str):
        try:
            parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None
    if parsed.tzinfo is None or parsed.tzinfo.utcoffset(parsed) is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)


def _coerce_number(value: Any) -> Optional[float]:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        num = float(value)
        return num if math.isfinite(num) else None
    if isinstance(value, str):
        stripped = value.strip()
        if not stripped:
            return None
        try:
            num = float(stripped)
        except ValueError:
            return None
        return num if math.isfinite(num) else None
    return None


def _coerce_bool(value: Any) -> Optional[bool]:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        normalized = value.strip().lower()
        if normalized in {"true", "1", "yes", "on"}:
            return True
        if normalized in {"false", "0", "no", "off"}:
            return False
    if isinstance(value, (int, float)) and value in {0, 1}:
        return bool(value)
    return None


def _sanitize_key(value: Any) -> str:
    key = str(value)
    if "." in key:
        key = key.replace(".", "_")
    if key.startswith("$"):
        key = key.replace("$", "_", 1)
    return key


def _iter_list_counts(value: Any) -> Iterable[Tuple[str, int | float]]:
    if isinstance(value, dict):
        for key, entry in value.items():
            count: int | float = 1
            if not isinstance(entry, bool) and isinstance(entry, int):
                count = entry
            elif isinstance(entry, float):
                count = int(entry) if entry.is_integer() else float(entry)
            yield str(key), count
        return
    if isinstance(value, (list, tuple, set)):
        for item in value:
            yield str(item), 1
        return
    yield str(value), 1
