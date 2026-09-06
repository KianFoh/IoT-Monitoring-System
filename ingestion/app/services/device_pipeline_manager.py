import json
import threading
import time
from pathlib import Path
from typing import Dict, List, Optional
from app.core.postgresql import SessionLocal
from app.models.customer import Customer
from app.models.distributor import Distributor
from app.models.department import Department
from app.models.device import Device
from app.services import custom_processing
from app.services.device_pipeline import DeviceInfo, DevicePipeline
from app.utils.coercion import coerce_bool, coerce_float
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
                    Device.dashboard_config,
                    Department.name,
                    Customer.name,
                    Customer.mqtt_topic,
                    Distributor.name,
                    Distributor.mqtt_topic,
                )
                .join(Department, Device.department_id == Department.id)
                .join(Customer, Department.customer_id == Customer.id)
                .outerjoin(Distributor, Customer.distributor_id == Distributor.id)
                .all()
            )
        finally:
            session.close()

        devices: List[DeviceInfo] = []
        for (
            uid,
            data_interval,
            is_active,
            dashboard_config,
            department_name,
            customer_name,
            customer_mqtt_topic,
            distributor_name,
            distributor_mqtt_topic,
        ) in rows:
            devices.append(
                DeviceInfo(
                    uid=uid,
                    customer_name=customer_name,
                    customer_mqtt_topic=customer_mqtt_topic or customer_name,
                    department_name=department_name,
                    distributor_name=distributor_name,
                    distributor_mqtt_topic=distributor_mqtt_topic or distributor_name,
                    data_interval=data_interval,
                    dashboard_config=dashboard_config,
                    is_active=is_active,
                )
            )
        return devices

    def fetch_device_by_uid(self, uid: str) -> Optional[DeviceInfo]:
        """Fetch one device with all pipeline metadata."""
        session = SessionLocal()
        try:
            row = (
                session.query(
                    Device.uid,
                    Device.data_interval,
                    Device.is_active,
                    Device.dashboard_config,
                    Department.name,
                    Customer.name,
                    Customer.mqtt_topic,
                    Distributor.name,
                    Distributor.mqtt_topic,
                )
                .join(Department, Device.department_id == Department.id)
                .join(Customer, Department.customer_id == Customer.id)
                .outerjoin(Distributor, Customer.distributor_id == Distributor.id)
                .filter(Device.uid == uid)
                .first()
            )
        finally:
            session.close()

        if not row:
            return None

        (
            device_uid,
            data_interval,
            is_active,
            dashboard_config,
            department_name,
            customer_name,
            customer_mqtt_topic,
            distributor_name,
            distributor_mqtt_topic,
        ) = row

        return DeviceInfo(
            uid=device_uid,
            customer_name=customer_name,
            customer_mqtt_topic=customer_mqtt_topic or customer_name,
            department_name=department_name,
            distributor_name=distributor_name,
            distributor_mqtt_topic=distributor_mqtt_topic or distributor_name,
            data_interval=data_interval,
            dashboard_config=dashboard_config,
            is_active=is_active,
        )


class DevicePipelineManager:
    def __init__(self, mqtt_client):
        """Manage device pipelines based on MQTT events"""
        self._mqtt_client = mqtt_client
        self._repository = DeviceRepository()
        self._pipelines: Dict[str, DevicePipeline] = {}
        self._processing_dir = Path(custom_processing.__file__).resolve().parent
        self._processing_snapshot = self._build_processing_snapshot()
        self._processing_lock = threading.Lock()
        self._stop_event = threading.Event()
        # Subscribe to all device event topics with MQTT wildcards.
        self._event_topic = "internal/devices/events/#"
        self._start_processing_watcher()

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

    def _build_processing_snapshot(self) -> Dict[str, float]:
        snapshot: Dict[str, float] = {}
        if not self._processing_dir.exists():
            return snapshot
        for path in self._processing_dir.glob("*.py"):
            if path.name.startswith("_"):
                continue
            try:
                snapshot[str(path)] = path.stat().st_mtime
            except OSError:
                continue
        return snapshot

    def _start_processing_watcher(self) -> None:
        if not self._processing_dir.exists():
            return
        thread = threading.Thread(target=self._watch_custom_processing, daemon=True)
        self._processing_thread = thread
        thread.start()

    def _watch_custom_processing(self) -> None:
        while not self._stop_event.is_set():
            time.sleep(1)
            current_snapshot = self._build_processing_snapshot()
            if current_snapshot == self._processing_snapshot:
                continue
            self._processing_snapshot = current_snapshot
            self._reload_custom_processors()

    def _reload_custom_processors(self) -> None:
        with self._processing_lock:
            reloaded = custom_processing.reload_processors()
            to_restart = []
            for pipeline in self._pipelines.values():
                has_processor = custom_processing.get_device_processor(pipeline.device.uid) is not None
                if pipeline.custom_processor or has_processor:
                    to_restart.append(pipeline.device)
        restarted = 0
        for device_info in to_restart:
            if self.restart_pipeline(device_info):
                restarted += 1
        if reloaded or restarted:
            logger.info(
                "Custom processors reloaded %s registered, %s pipelines restarted",
                reloaded,
                restarted,
            )

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
        customer_mqtt_topic = data.get("customer_mqtt_topic") or customer_name
        department_name = data.get("department_name")
        if not event_type or not device_uid or not customer_mqtt_topic or not department_name:
            logger.warning("Device event missing required fields")
            return

        raw_interval = data.get("data_interval")
        data_interval = coerce_float(raw_interval)
        if raw_interval is not None and data_interval is None:
            logger.warning("Invalid data_interval in device event payload")
        if data_interval is None:
            existing = self._pipelines.get(device_uid)
            data_interval = existing.device.data_interval if existing else 60.0

        is_active = coerce_bool(data.get("is_active"))

        distributor_name = data.get("distributor_name")
        distributor_mqtt_topic = data.get("distributor_mqtt_topic") or distributor_name
        if not distributor_mqtt_topic:
            existing = self._pipelines.get(device_uid)
            distributor_mqtt_topic = (
                existing.device.distributor_mqtt_topic or existing.device.distributor_name
                if existing
                else None
            )
            distributor_name = existing.device.distributor_name if existing else None

        restart_requested = data.get("restart_pipeline")

        if event_type == "add":
            device_info = self._repository.fetch_device_by_uid(device_uid)
            if not device_info:
                logger.warning(f"Device event add: device {device_uid} not found in database")
                return
            if device_info.is_active:
                started = self.start_pipeline(device_info)
                if started:
                    logger.info(f"Device event add: started pipeline for {device_uid}")
                else:
                    logger.info(f"Device event add: pipeline already running for {device_uid}")
            else:
                logger.info(f"Device event add: device inactive, pipeline not started for {device_uid}")
            return

        if event_type == "update":
            if not restart_requested:
                return
            device_info = self._repository.fetch_device_by_uid(device_uid)
            if not device_info:
                logger.warning(f"Device event update: device {device_uid} not found in database")
                return
            if device_info.is_active:
                restarted = self.restart_pipeline(device_info)
                if restarted:
                    logger.info(f"Device event update: restarted pipeline for {device_uid}")
                else:
                    logger.warning(f"Device event update: failed to restart pipeline for {device_uid}")
            else:
                destroyed = self.stop_pipeline(device_uid)
                if destroyed:
                    logger.info(f"Device event update: destroyed pipeline for {device_uid}")
                else:
                    logger.info(f"Device event update: no pipeline to destroy for {device_uid}")
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
        self._stop_event.set()
        processing_thread = getattr(self, "_processing_thread", None)
        if processing_thread:
            processing_thread.join(timeout=2)
        for pipeline in list(self._pipelines.values()):
            pipeline.stop()
        self._pipelines.clear()
