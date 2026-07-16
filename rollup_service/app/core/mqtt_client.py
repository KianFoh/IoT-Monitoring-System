import paho.mqtt.client as mqtt

from app.core.config import settings
from app.utils.logger import logger


class MQTTClient:
    def __init__(self):
        self.client = mqtt.Client()
        self.on_connect_handler = None

        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)

        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect

    def set_on_connect_handler(self, handler):
        self.on_connect_handler = handler

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logger.info("Connected to MQTT broker")
            if self.on_connect_handler:
                self.on_connect_handler(client, userdata, flags, rc)
            return
        logger.error("Failed to connect to MQTT broker, code: %s", rc)

    def on_disconnect(self, _client, _userdata, rc):
        if rc != 0:
            logger.warning("Unexpected MQTT disconnect. Code: %s", rc)

    def subscribe(self, topic: str):
        self.client.subscribe(topic)
        logger.info("Subscribed to topic: %s", topic)

    def message_callback_add(self, topic: str, callback):
        self.client.message_callback_add(topic, callback)

    def connect(self) -> bool:
        try:
            self.client.connect(
                settings.MQTT_BROKER_HOST,
                settings.MQTT_BROKER_PORT,
                settings.MQTT_KEEPALIVE,
            )
            return True
        except Exception as exc:
            logger.error("Failed to connect to MQTT broker: %s", exc)
            return False

    def start_loop(self):
        self.client.loop_forever()

    def stop(self):
        self.client.disconnect()
