import json
from typing import Dict, List, Optional
from app.core.postgresql import SessionLocal
from app.models.customer import Customer
from app.models.department import Department
from app.models.device import Device
from app.core.config import settings
from app.services.device_pipeline import DeviceInfo, DevicePipeline
from app.utils.logger import logger


class DeviceRepository:
    def fetch_devices(self) -> List[DeviceInfo]:
        """Fetch all devices"""
        session = SessionLocal()
        try:
            rows = (
                session.query(
                    Device.uid,
                    Device.data_interval,
                    Device.is_active,
                    Department.name,
                    Customer.name,
                )
                .join(Department, Device.department_id == Department.id)
                .join(Customer, Department.customer_id == Customer.id)
                .all()
            )
        finally:
            session.close()

        devices: List[DeviceInfo] = []
        for uid, data_interval, is_active, department_name, customer_name in rows:
            if not customer_name or not department_name:
                logger.warning(f"Device {uid} missing customer or department; skipping")
                continue
            interval_value = data_interval if data_interval is not None else 60
            devices.append(
                DeviceInfo(
                    uid=uid,
                    customer_name=customer_name,
                    department_name=department_name,
                    data_interval=interval_value,
                    is_active=is_active,
                )
            )
        return devices


class DevicePipelineManager:
    def __init__(self, mqtt_client, repository: Optional[DeviceRepository] = None):
        """Manage device pipelines based on MQTT events"""
        self._mqtt_client = mqtt_client
        self._repository = repository or DeviceRepository()
        self._pipelines: Dict[str, DevicePipeline] = {}
        # Subscribe to all device event topics with MQTT wildcards.
        self._event_topic = settings.MQTT_DEVICE_EVENT_TOPIC.format(
            customer_name="+",
            department_name="+",
            device_uid="+",
        )

    def load_existing_devices(self):
        """Load existing devices and start pipelines"""
        devices = self._repository.fetch_devices()
        started = 0
        existing = 0
        for device_info in devices:
            if device_info.uid in self._pipelines:
                existing += 1
                continue
            if self.start_pipeline(device_info):
                started += 1
        logger.info(f"Started {started} new device pipelines ({existing} already running)")
        return started, existing, len(devices)

    @staticmethod
    def _coerce_int(value) -> Optional[int]:
        if value is None:
            return None
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _coerce_bool(value) -> bool:
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized == "true":
                return True
            if normalized == "false":
                return False
        return False

    def start_pipeline(self, device_info: DeviceInfo) -> bool:
        if device_info.uid in self._pipelines:
            return False
        pipeline = DevicePipeline(device_info, self._mqtt_client)
        if not pipeline.start():
            return False
        self._pipelines[device_info.uid] = pipeline
        return True

    def resubscribe_all(self):
        count = 0
        for pipeline in list(self._pipelines.values()):
            pipeline.resubscribe()
            count += 1
        return count

    def stop_pipeline(self, device_uid: str, update_status: bool = True) -> bool:
        pipeline = self._pipelines.pop(device_uid, None)
        if not pipeline:
            return False
        pipeline.stop(update_status=update_status)
        return True

    def restart_pipeline(self, device_info: DeviceInfo) -> bool:
        self.stop_pipeline(device_info.uid)
        return self.start_pipeline(device_info)

    def _subscribe_event_topic(self):
        self._mqtt_client.message_callback_add(self._event_topic, self.handle_event_message)
        self._mqtt_client.subscribe(self._event_topic)
        logger.info(f"Subscribed to device events: {self._event_topic}")

    def handle_mqtt_connect(self, *_args, **_kwargs):
        self._subscribe_event_topic()
        resubscribed = self.resubscribe_all()
        if resubscribed:
            logger.info(f"Resubscribed {resubscribed} existing pipelines")
        self.load_existing_devices()

    def handle_event_message(self, _client, _userdata, msg):
        try:
            data = json.loads(msg.payload.decode("utf-8"))
        except json.JSONDecodeError:
            logger.warning("Invalid JSON in device event payload")
            return

        if not isinstance(data, dict):
            logger.warning("Device event payload is not a JSON object")
            return

        event_type = str(data.get("event_type", "")).lower()
        device_uid = data.get("uid")
        customer_name = data.get("customer_name")
        department_name = data.get("department_name")
        if not event_type or not device_uid or not customer_name or not department_name:
            logger.warning("Device event missing required fields")
            return

        raw_interval = data.get("data_interval")
        data_interval = self._coerce_int(raw_interval)
        if raw_interval is not None and data_interval is None:
            logger.warning("Invalid data_interval in device event payload")
        if data_interval is None:
            existing = self._pipelines.get(device_uid)
            data_interval = existing.device.data_interval if existing else 60

        is_active = self._coerce_bool(data.get("is_active"))

        restart_requested = data.get("restart_pipeline")

        device_info = DeviceInfo(
            uid=device_uid,
            customer_name=customer_name,
            department_name=department_name,
            data_interval=data_interval,
            is_active=is_active,
        )

        if event_type == "add":
            if device_info.is_active:
                started = self.start_pipeline(device_info)
                if started:
                    logger.info(f"Device event add: started pipeline for {device_uid}")
                else:
                    logger.info(f"Device event add: pipeline already running for {device_uid}")
            else:
                logger.info(f"Device event add: device inactive; pipeline not started for {device_uid}")
            return

        if event_type == "update":
            if not restart_requested:
                return
            if device_info.is_active:
                restarted = self.restart_pipeline(device_info)
                if restarted:
                    logger.info(f"Device event update: restarted pipeline for {device_uid}")
                else:
                    logger.warning(f"Device event update: failed to restart pipeline for {device_uid}")
            else:
                stopped = self.stop_pipeline(device_uid)
                if stopped:
                    logger.info(f"Device event update: stopped pipeline for {device_uid}")
                else:
                    logger.info(f"Device event update: no pipeline to stop for {device_uid}")
            return

        if event_type == "delete":
            destroyed = self.stop_pipeline(device_uid, update_status=False)
            if destroyed:
                logger.info(f"Device event delete: destroyed pipeline for {device_uid}")
            else:
                logger.info(f"Device event delete: no pipeline to destroy for {device_uid}")
            return

        logger.warning(f"Unknown device event type: {event_type}")

    def stop(self):
        for pipeline in list(self._pipelines.values()):
            pipeline.stop()
        self._pipelines.clear()
