import json
import logging

import paho.mqtt.client as mqtt

from app.core.config import get_settings

settings = get_settings()


class MQTTClient:
    """MQTT client for backend connection only."""

    def __init__(self):
        self.client = mqtt.Client()
        self.client.reconnect_delay_set(min_delay=1, max_delay=60)

        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)

        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect

    def on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            logging.info("Connected to MQTT broker")
        else:
            logging.error("Failed to connect to MQTT broker, code: %s", rc)

    def on_disconnect(self, client, userdata, rc):
        if rc != 0:
            logging.warning("Unexpected MQTT disconnect, code: %s. Reconnecting...", rc)

    def connect(self) -> bool:
        try:
            self.client.connect_async(
                settings.MQTT_BROKER_HOST,
                settings.MQTT_BROKER_PORT,
                settings.MQTT_KEEPALIVE,
            )
            return True
        except Exception as exc:
            logging.error("Failed to connect to MQTT broker: %s", exc)
            return False

    def publish(self, topic: str, payload: dict) -> bool:
        try:
            payload_json = json.dumps(payload, default=str)
            result = self.client.publish(topic, payload_json)
            if result.rc != mqtt.MQTT_ERR_SUCCESS:
                logging.error("MQTT publish failed with code: %s", result.rc)
                return False
            return True
        except Exception as exc:
            logging.error("Failed to publish MQTT message: %s", exc)
            return False

    def start(self):
        self.client.loop_start()

    def stop(self):
        self.client.disconnect()
        self.client.loop_stop()
