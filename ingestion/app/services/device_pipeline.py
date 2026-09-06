import json
from dataclasses import dataclass
from typing import Any, Dict, Optional

from app.core.mongo import (
    get_data_collection,
    get_latest_collection,
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
    customer_mqtt_topic: str
    department_name: str
    distributor_name: Optional[str]
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
        self.custom_processor = get_device_processor(device.uid)
        self.field_types = self._extract_data_panel_schema()
        
    @property
    def device_topic(self):
        customer = self._normalize_topic_value(self.device.customer_mqtt_topic or self.device.customer_name)
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

        if self.field_types:
            data = {k: v for k, v in data.items() if k in self.field_types}
        doc = {"device_id": device_id, "ts": utc_now(), "data": data}

        # Publish processed data.
        self._publish_processed(device_id, doc["ts"], data)

        # Store the processed payload in MongoDB.
        self.data_collection.insert_one(doc)

        # Update latest snapshot in MongoDB.
        self._upsert_latest(device_id, doc["ts"], data)

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
            json.dumps(
                {
                    "device_id": self.device.uid,
                    "status": new_status,
                }
            ),
        )
        self._update_device_status(new_status == "online")

    def _build_internal_topic(self, topic_type: str) -> str:
        customer = self._normalize_topic_value(self.device.customer_mqtt_topic or self.device.customer_name)
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
