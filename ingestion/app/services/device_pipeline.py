from dataclasses import dataclass

from app.core.config import settings
from app.core.mongo import get_collection
from app.core.postgresql import SessionLocal
from app.models.device import Device
from app.utils.logger import logger
from app.utils.time import utc_now


@dataclass(frozen=True)
class DeviceInfo:
    uid: str
    customer_name: str
    data_interval: int
    is_active: bool

class DevicePipeline:
    def __init__(self, device, mqtt_client):
        self.device = device
        self.mqtt = mqtt_client
        self.last_seen = None
        self.status = "offline"
        self.running = False
        self.collection = get_collection()
        
    @property
    def device_topic(self):
        return settings.MQTT_DEVICE_RAW_DATA_TOPIC.format(customer_name=self.device.customer_name, device_uid=self.device.uid)

    @property
    def processed_topic(self):
        return settings.MQTT_DEVICE_PROCESSED_DATA_TOPIC.format(customer_name=self.device.customer_name, device_uid=self.device.uid)
    
    def start(self):
        if not self.device.is_active:
            return False

        self.running = True
        # Subscribe to MQTT
        self.mqtt.subscribe(self.device_topic)
        self.mqtt.message_callback_add(self.device_topic, self.on_message)
        # Start watchdog in separate thread
        self._start_watchdog()
        return True

    def stop(self):
        self.running = False
        self.mqtt.unsubscribe(self.device_topic)

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
        import json
        payload = json.loads(msg.payload.decode())

        payload["timestamp"] = utc_now().isoformat()
        payload["topic"] = msg.topic
        payload["device_uid"] = self.device.uid
        payload["customer_name"] = self.device.customer_name

        self.mqtt.publish(
            self.processed_topic,
            json.dumps(payload)
        )

        self.collection.insert_one(payload)

        # Update last_seen for status logic
        self.last_seen = utc_now()


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

                if new_status != self.status:
                    self.status = new_status
                    self.mqtt.publish(
                        settings.MQTT_DEVICE_STATUS_TOPIC.format(
                            customer_name=self.device.customer_name,
                            device_uid=self.device.uid
                        ),
                        new_status
                    )
                    self._update_device_status(new_status == "online")

                time.sleep(1)

        Thread(target=loop, daemon=True).start()

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
