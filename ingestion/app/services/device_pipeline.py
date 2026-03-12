import json
from dataclasses import dataclass
from typing import Any, Dict, Iterable, Optional, Tuple
import math

from app.core.mongo import (
    get_data_collection,
    get_latest_collection,
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
    data_interval: float
    is_active: bool

class DevicePipeline:
    def __init__(self, device, mqtt_client):
        self.device = device
        self.mqtt = mqtt_client
        self.last_seen = None
        self.status = "offline"
        self.running = False
        self.data_collection = get_data_collection()
        self.latest_collection = get_latest_collection()
        self.rollup_hour_collection = get_rollup_hour_collection()
        self.custom_processor = get_device_processor(device.uid)
        
    @property
    def device_topic(self):
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
        device_id = raw.get("device_id")

        if not device_id:
            return

        # Extract dynamic fields (everything except device_id)
        data = {k: v for k, v in raw.items() if k != "device_id"}
        data = self._apply_custom_processing(data)

        doc = {"device_id": device_id, "ts": utc_now(), "data": data}

        # Publish processed data.
        self._publish_processed(device_id, doc["ts"], data)

        # Store raw doc in MongoDB.
        self.data_collection.insert_one(doc)

        # Update latest snapshot in MongoDB.
        self._upsert_latest(device_id, doc["ts"], data)

        # Update hourly rollup.
        self._update_rollup_hour(device_id, doc["ts"], data)

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

    def _update_rollup_hour(self, device_id: str, timestamp, data: Dict[str, Any]) -> None:
        bucket_ts = timestamp.replace(minute=0, second=0, microsecond=0)
        inc_ops: Dict[str, float] = {}
        set_ops: Dict[str, Any] = {}
        max_ops: Dict[str, Any] = {}

        for key, value in data.items():
            if value is None:
                continue
            if isinstance(value, (dict, list, tuple, set)):
                for item_key, inc in self._iter_list_counts(value):
                    target_key = self._sanitize_key(item_key)
                    inc_key = f"data.{key}.{target_key}"
                    inc_ops[inc_key] = inc_ops.get(inc_key, 0.0) + inc
                continue

            if isinstance(value, bool):
                set_ops[f"data.{key}"] = value
                max_ops[f"meta.text_last_ts.{key}"] = timestamp
                continue

            numeric_value = self._coerce_number(value)
            if numeric_value is not None:
                sum_key = f"meta.num_sum.{key}"
                count_key = f"meta.num_count.{key}"
                inc_ops[sum_key] = inc_ops.get(sum_key, 0.0) + numeric_value
                inc_ops[count_key] = inc_ops.get(count_key, 0.0) + 1.0
                continue

            set_ops[f"data.{key}"] = value
            max_ops[f"meta.text_last_ts.{key}"] = timestamp

        if not (inc_ops or set_ops or max_ops):
            return

        update_doc: Dict[str, Any] = {"$setOnInsert": {"device_id": device_id, "ts": bucket_ts}}
        if inc_ops:
            update_doc["$inc"] = inc_ops
        if set_ops:
            update_doc["$set"] = set_ops
        if max_ops:
            update_doc["$max"] = max_ops

        self.rollup_hour_collection.update_one(
            {"device_id": device_id, "ts": bucket_ts},
            update_doc,
            upsert=True,
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
    def _sanitize_key(value: Any) -> str:
        key = str(value)
        if "." in key:
            key = key.replace(".", "_")
        if key.startswith("$"):
            key = key.replace("$", "_", 1)
        return key

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
    def _iter_list_counts(value: Any) -> Iterable[Tuple[str, float]]:
        if isinstance(value, dict):
            for key, entry in value.items():
                count = 1.0
                if not isinstance(entry, bool) and isinstance(entry, (int, float)):
                    count = float(entry)
                yield str(key), count
            return
        if isinstance(value, (list, tuple, set)):
            for item in value:
                yield str(item), 1.0
            return
        yield str(value), 1.0

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
