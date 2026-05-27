import json
from dataclasses import dataclass
from typing import Any, Dict, Iterable, Optional, Tuple
import math

from app.core.mongo import (
    get_data_collection,
    get_latest_collection,
    get_rollup_min_collection,
    get_rollup_hour_collection,
)
from app.core.postgresql import SessionLocal
from app.models.device import Device
from app.services.custom_processing import get_device_processor
from app.utils.logger import logger
from app.utils.time import utc_now


@dataclass(frozen=True)
class DeviceInfo:
    uid: str
    customer_name: str
    department_name: str
    distributor_name: Optional[str]
    sub: Optional[str]
    pub: Optional[str]
    data_interval: float
    is_active: bool
    dashboard_config: Optional[Dict[str, Any]]

class DevicePipeline:
    def __init__(self, device, mqtt_client):
        self.device = device
        self.mqtt = mqtt_client
        self.last_seen = None
        self.status = "offline"
        self.running = False
        self.data_collection = get_data_collection()
        self.latest_collection = get_latest_collection()
        self.rollup_min_collection = get_rollup_min_collection()
        self.rollup_hour_collection = get_rollup_hour_collection()
        self.custom_processor = get_device_processor(device.uid)
        self.field_types = self._extract_data_panel_schema()
        
    @property
    def device_topic(self):
        if self.device.sub:
            return self.device.sub
        customer = self._normalize_topic_value(self.device.customer_name)
        distributor = self._normalize_topic_value(self.device.distributor_name) if self.device.distributor_name else ""
        if distributor:
            return f"{distributor}/{customer}/json/send/{self.device.uid}/"
        return f"{customer}/json/send/{self.device.uid}/"

    @property
    def processed_topic(self):
        return self._build_internal_topic("processed")
    
    def start(self):
        if not self.device.is_active:
            return False

        self.running = True
        if self.custom_processor:
            logger.info(f"Custom processor enabled for device {self.device.uid}")
        # Subscribe to the device topic and attach handler.
        self.mqtt.subscribe(self.device_topic)
        self.mqtt.message_callback_add(self.device_topic, self.on_message)
        # Start watchdog in a separate thread.
        self._start_watchdog()
        return True

    def stop(self, update_status: bool = True):
        self.running = False
        self.mqtt.unsubscribe(self.device_topic)
        try:
            self.mqtt.message_callback_remove(self.device_topic)
        except Exception:
            pass
        if update_status:
            self._set_status("offline", force=True)

    def resubscribe(self):
        if not self.running:
            return
        try:
            self.mqtt.message_callback_remove(self.device_topic)
        except Exception:
            pass
        self.mqtt.subscribe(self.device_topic)
        self.mqtt.message_callback_add(self.device_topic, self.on_message)

    def on_message(self, client, userdata, msg):
        raw = self._parse_payload(msg.payload)
        if raw is None:
            logger.warning("Invalid JSON in device payload")
            return
        payload = self._extract_device_payload(raw)
        if payload is None:
            logger.warning("Device payload missing device_id")
            return
        device_id = payload.get("device_id")

        if not device_id:
            return

        # Extract dynamic fields (everything except device_id)
        data = {k: v for k, v in payload.items() if k != "device_id"}
        data = self._apply_custom_processing(data)

        if self.field_types:
            data = {k: v for k, v in data.items() if k in self.field_types}
        doc = {"device_id": device_id, "ts": utc_now(), "data": data}

        # Publish processed data.
        self._publish_processed(device_id, doc["ts"], data)

        # Store the processed payload in MongoDB.
        self.data_collection.insert_one(doc)

        # Update latest snapshot in MongoDB.
        self._upsert_latest(device_id, doc["ts"], data)

        # Update minute and hourly rollups.
        self._update_rollups(device_id, doc["ts"], data, self.field_types)

        # Update last seen timestamp.
        self.last_seen = doc["ts"]

    def _publish_processed(self, device_id: str, timestamp, data: Dict[str, Any]) -> None:
        self.mqtt.publish(
            self.processed_topic,
            json.dumps(
                {
                    "device_id": device_id,
                    "ts": timestamp.isoformat(),
                    "data": data,
                }
            ),
        )

    def _upsert_latest(self, device_id: str, timestamp, data: Dict[str, Any]) -> None:
        update_fields = {f"data.{key}": value for key, value in data.items()}
        update_fields["ts"] = timestamp
        self.latest_collection.update_one(
            {"device_id": device_id},
            {
                "$set": update_fields,
                "$setOnInsert": {"device_id": device_id},
            },
            upsert=True,
        )

    def _update_rollups(self, device_id: str, timestamp, data: Dict[str, Any], field_types: Dict[str, str]) -> None:
        self._update_rollup(
            self.rollup_min_collection,
            device_id,
            timestamp,
            timestamp.replace(second=0, microsecond=0),
            data,
            field_types,
        )
        self._update_rollup(
            self.rollup_hour_collection,
            device_id,
            timestamp,
            timestamp.replace(minute=0, second=0, microsecond=0),
            data,
            field_types,
        )

    def _update_rollup(self, collection, device_id: str, timestamp, bucket_ts, data: Dict[str, Any], field_types: Dict[str, str]) -> None:
        if collection is None:
            return

        inc_ops: Dict[str, int | float] = {}
        set_ops: Dict[str, Any] = {}
        max_ops: Dict[str, Any] = {}
        min_ops: Dict[str, Any] = {}

        for key, value in data.items():
            if value is None:
                continue

            ftype = field_types.get(key, "text")

            # ================= LIST =================
            if ftype == "list":
                for item_key, inc in self._iter_list_counts(value):
                    target_key = self._sanitize_key(item_key)
                    inc_key = f"data.{key}.{target_key}"
                    inc_ops[inc_key] = inc_ops.get(inc_key, 0) + inc

                count_key = f"meta.value_count.{key}"
                inc_ops[count_key] = inc_ops.get(count_key, 0) + 1
                continue

            # ================= BOOLEAN =================
            if ftype in {"boolean", "bool"}:
                set_ops[f"data.{key}"] = value
                max_ops[f"meta.text_last_ts.{key}"] = timestamp

                count_key = f"meta.value_count.{key}"
                inc_ops[count_key] = inc_ops.get(count_key, 0) + 1

                state_key = self._rollup_state_key(value)
                state_count_key = f"meta.value_state_count.{key}.{state_key}"
                inc_ops[state_count_key] = inc_ops.get(state_count_key, 0) + 1
                continue

            # ================= NUMBER =================
            if ftype in {"number", "numeric", "float", "int"}:
                numeric_value = self._coerce_number(value)

                if numeric_value is not None:
                    sum_key = f"meta.num_sum.{key}"
                    count_key = f"meta.num_count.{key}"

                    inc_ops[sum_key] = inc_ops.get(sum_key, 0.0) + numeric_value
                    inc_ops[count_key] = inc_ops.get(count_key, 0) + 1

                    min_ops[f"meta.num_min.{key}"] = numeric_value
                    max_ops[f"meta.num_max.{key}"] = numeric_value

                # still count existence
                count_key = f"meta.value_count.{key}"
                inc_ops[count_key] = inc_ops.get(count_key, 0) + 1
                continue

            # ================= TEXT =================
            if ftype == "text":
                set_ops[f"data.{key}"] = value
                max_ops[f"meta.text_last_ts.{key}"] = timestamp

                count_key = f"meta.value_count.{key}"
                inc_ops[count_key] = inc_ops.get(count_key, 0) + 1

                state_key = self._rollup_state_key(value)
                state_count_key = f"meta.value_state_count.{key}.{state_key}"
                inc_ops[state_count_key] = inc_ops.get(state_count_key, 0) + 1
                continue

            # ================= OTHER TYPES =================
            set_ops[f"data.{key}"] = value
            max_ops[f"meta.text_last_ts.{key}"] = timestamp

            count_key = f"meta.value_count.{key}"
            inc_ops[count_key] = inc_ops.get(count_key, 0) + 1

        # ================= APPLY UPDATE =================
        if not (inc_ops or set_ops or max_ops or min_ops):
            return

        update_doc: Dict[str, Any] = {
            "$setOnInsert": {
                "device_id": device_id,
                "ts": bucket_ts
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
        self._sync_rollup_numeric_snapshots(collection, device_id, bucket_ts, field_types)

    def _sync_rollup_numeric_snapshots(self, collection, device_id: str, bucket_ts, field_types: Dict[str, str]) -> None:
        numeric_fields = [
            field
            for field, ftype in field_types.items()
            if ftype in {"number", "numeric", "float", "int"}
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
            set_stage[f"data.{field}"] = avg_expr
            set_stage[f"meta.num_avg.{field}"] = avg_expr

        collection.update_one(
            {"device_id": device_id, "ts": bucket_ts},
            [{"$set": set_stage}],
        )

    @staticmethod
    def _parse_payload(payload: bytes) -> Dict[str, Any] | None:
        try:
            return json.loads(payload.decode())
        except (json.JSONDecodeError, UnicodeDecodeError):
            return None

    def _apply_custom_processing(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if not self.custom_processor:
            return data
        try:
            processed = self.custom_processor(data)
            if isinstance(processed, dict):
                return processed
            logger.warning(f"Custom processor for {self.device.uid} returned non-dict; using original data")
        except Exception as exc:
            logger.error(f"Custom processor failed for {self.device.uid}: {exc}")
        return data

    @staticmethod
    def _extract_device_payload(raw: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if not isinstance(raw, dict):
            return None
        if raw.get("device_id"):
            return raw
        for value in raw.values():
            if isinstance(value, dict) and value.get("device_id"):
                return value
        return None

    @staticmethod
    def _sanitize_key(value: Any) -> str:
        key = str(value)
        if "." in key:
            key = key.replace(".", "_")
        if key.startswith("$"):
            key = key.replace("$", "_", 1)
        return key

    @classmethod
    def _rollup_state_key(cls, value: Any) -> str:
        if isinstance(value, bool):
            return "true" if value else "false"
        return cls._sanitize_key(value)

    @staticmethod
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

    @staticmethod
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

    def _start_watchdog(self):
        from threading import Thread
        import time  

        def loop():
            while self.running:
                if self.last_seen is None:
                    new_status = "offline"
                else:
                    diff = (utc_now() - self.last_seen).total_seconds()
                    if diff > self.device.data_interval * 2:
                        new_status = "offline"
                    else:
                        new_status = "online"

                if not self.running:
                    break
                if new_status != self.status:
                    self._set_status(new_status)

                time.sleep(1)

        Thread(target=loop, daemon=True).start()

    def _set_status(self, new_status: str, force: bool = False):
        if not force and new_status == self.status:
            return
        self.status = new_status
        self.mqtt.publish(
            self._build_internal_topic("status"),
            new_status,
        )
        self._update_device_status(new_status == "online")

    def _build_internal_topic(self, topic_type: str) -> str:
        customer = self._normalize_topic_value(self.device.customer_name)
        department = self._normalize_topic_value(self.device.department_name)
        distributor = self._normalize_topic_value(self.device.distributor_name) if self.device.distributor_name else ""
        if distributor:
            return f"internal/devices/{topic_type}/{distributor}/{customer}/{department}/{self.device.uid}/"
        return f"internal/devices/{topic_type}/{customer}/{department}/{self.device.uid}/"

    @staticmethod
    def _normalize_topic_value(value: str) -> str:
        return str(value or "").strip().lower()

    def _update_device_status(self, is_online: bool):
        session = SessionLocal()
        try:
            device = session.query(Device).filter_by(uid=self.device.uid).first()
            if device:
                device.is_online = is_online
                session.commit()
            else:
                logger.warning(f"Device with UID {self.device.uid} not found")
        except Exception as exc:
            logger.error(f"Failed to update device status: {exc}")
            session.rollback()
        finally:
            session.close()

    def _extract_data_panel_schema(self):
        field_types = {}

        dashboard_config = getattr(self.device, "dashboard_config", None)
        if not isinstance(dashboard_config, dict):
            logger.info(f"Device {getattr(self.device, 'uid', None)} has no dashboard_config or not a dict.")
            return field_types

        if "data_panel" in dashboard_config:
            data_panel = dashboard_config.get("data_panel")
            if not isinstance(data_panel, dict):
                logger.info(f"Device {getattr(self.device, 'uid', None)} has no data_panel or not a dict.")
                return field_types
            fields = data_panel.get("fields", [])
            config = data_panel.get("config", {})
        else:
            fields = dashboard_config.get("data_panel_fields", [])
            config = dashboard_config.get("data_panel_config", {})

        if not isinstance(fields, list) or not isinstance(config, dict):
            logger.info(f"Device {getattr(self.device, 'uid', None)} has invalid fields/config in data_panel.")
            return field_types

        for key in fields:
            if not isinstance(key, str) or not key.strip():
                continue
            cfg = config.get(key, {})
            dtype = str(cfg.get("type", "text")).strip().lower() if isinstance(cfg, dict) else "text"
            field_types[key] = dtype

        return field_types
