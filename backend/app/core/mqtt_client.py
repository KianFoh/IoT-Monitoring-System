import json
import logging
from typing import Callable

import paho.mqtt.client as mqtt

from app.core.config import get_settings

settings = get_settings()
logger = logging.getLogger(__name__)


class MQTTClient:
    """MQTT client for backend connection"""

    def __init__(self):
        self.client = mqtt.Client()
        self.client.reconnect_delay_set(min_delay=1, max_delay=60)
        self.message_handlers: list[Callable[[str, bytes], None]] = []
        self._subscriptions: set[str] = set()

        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)

        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("Connected to MQTT broker")
            for topic in sorted(self._subscriptions):
                self._subscribe_with_client(client, topic)
        else:
            logger.error("Failed to connect to MQTT broker, code: %s", rc)

    def on_disconnect(self, client, userdata, rc):
        if rc != 0:
            logger.warning("Unexpected MQTT disconnect, code: %s. Reconnecting...", rc)

    def on_message(self, client, userdata, msg):
        if not self.message_handlers:
            return
        for handler in list(self.message_handlers):
            try:
                handler(msg.topic, msg.payload)
            except Exception as exc:
                logger.exception("MQTT message handler failed: %s", exc)

    def connect(self) -> bool:
        try:
            self.client.connect_async(
                settings.MQTT_BROKER_HOST,
                settings.MQTT_BROKER_PORT,
                settings.MQTT_KEEPALIVE,
            )
            return True
        except Exception as exc:
            logger.exception("Failed to connect to MQTT broker: %s", exc)
            return False

    def add_message_handler(self, handler: Callable[[str, bytes], None]) -> None:
        self.message_handlers.append(handler)

    def remove_message_handler(self, handler: Callable[[str, bytes], None]) -> None:
        try:
            self.message_handlers.remove(handler)
        except ValueError:
            return

    def subscribe(self, topic: str) -> None:
        self._subscriptions.add(topic)
        if not self.client.is_connected():
            return
        self._subscribe_with_client(self.client, topic)

    def _subscribe_with_client(self, client, topic: str) -> bool:
        try:
            result = client.subscribe(topic)
            if result[0] != mqtt.MQTT_ERR_SUCCESS:
                logger.error("Failed to subscribe to topic: %s (code: %s)", topic, result[0])
                return False
            logger.info("Subscribed to topic: %s", topic)
            return True
        except Exception as exc:
            logger.exception("Failed to subscribe to topic: %s (%s)", topic, exc)
            return False

    def publish(self, topic: str, payload: dict) -> bool:
        try:
            payload_json = json.dumps(payload, default=str)
            return self._publish_bytes(topic, payload_json.encode("utf-8"))
        except Exception as exc:
            logger.exception("Failed to publish MQTT message: %s", exc)
            return False

    def publish_raw(self, topic: str, payload: str | bytes) -> bool:
        try:
            payload_bytes = payload.encode("utf-8") if isinstance(payload, str) else payload
            return self._publish_bytes(topic, payload_bytes)
        except Exception as exc:
            logger.exception("Failed to publish raw MQTT message: %s", exc)
            return False

    def _publish_bytes(self, topic: str, payload: bytes) -> bool:
        result = self.client.publish(topic, payload)
        if result.rc != mqtt.MQTT_ERR_SUCCESS:
            logger.error("MQTT publish failed with code: %s", result.rc)
            return False
        return True

    def start(self):
        self.client.loop_start()

    def stop(self):
        self.client.disconnect()
        self.client.loop_stop()
