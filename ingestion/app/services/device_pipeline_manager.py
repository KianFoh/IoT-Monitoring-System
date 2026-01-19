from typing import Dict, List, Optional

from app.core.postgresql import SessionLocal
from app.models.customer import Customer
from app.models.department import Department
from app.models.device import Device
from app.services.device_pipeline import DeviceInfo, DevicePipeline
from app.utils.logger import logger


class DeviceRepository:
    def fetch_devices(self) -> List[DeviceInfo]:
        session = SessionLocal()
        try:
            rows = (
                session.query(
                    Device.uid,
                    Device.data_interval,
                    Device.is_active,
                    Customer.name,
                )
                .join(Department, Device.department_id == Department.id)
                .join(Customer, Department.customer_id == Customer.id)
                .all()
            )
        finally:
            session.close()

        devices: List[DeviceInfo] = []
        for uid, data_interval, is_active, customer_name in rows:
            if not customer_name:
                logger.warning(f"Device {uid} has no customer; skipping")
                continue
            interval_value = data_interval if data_interval is not None else 60
            devices.append(
                DeviceInfo(
                    uid=uid,
                    customer_name=customer_name,
                    data_interval=interval_value,
                    is_active=is_active,
                )
            )
        return devices


class DevicePipelineManager:
    def __init__(self, mqtt_client, repository: Optional[DeviceRepository] = None):
        self._mqtt_client = mqtt_client
        self._repository = repository or DeviceRepository()
        self._pipelines: Dict[str, DevicePipeline] = {}

    def load_existing_devices(self):
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

    def handle_mqtt_connect(self, *_args, **_kwargs):
        resubscribed = self.resubscribe_all()
        if resubscribed:
            logger.info(f"Resubscribed {resubscribed} existing pipelines")
        self.load_existing_devices()

    def stop(self):
        for pipeline in list(self._pipelines.values()):
            pipeline.stop()
        self._pipelines.clear()
