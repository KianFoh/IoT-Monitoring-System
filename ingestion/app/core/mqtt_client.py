import paho.mqtt.client as mqtt
from app.core.config import settings
from app.utils.logger import logger


class MQTTClient:
    """MQTT Client for receiving data"""

    def __init__(self):
        self.client = mqtt.Client()
        self.message_handler = None

        # Set authentication
        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)

        # Set callbacks
        self.client.on_connect = self.on_connect
        self.client.on_message = self.on_message
        self.client.on_disconnect = self.on_disconnect

    def set_message_handler(self, handler):
        """Set function yang akan handle message"""
        self.message_handler = handler

    def on_connect(self, client, userdata, flags, rc):
        """Callback saat connect ke broker"""
        if rc == 0:
            logger.info("✓ Connected to MQTT Broker")
            # Subscribe to topic
            client.subscribe(settings.MQTT_TOPIC_PATTERN)
            logger.info(f"✓ Subscribed to: {settings.MQTT_TOPIC_PATTERN}")
        else:
            logger.error(f"✗ Failed to connect, code: {rc}")

    def on_message(self, client, userdata, msg):
        """Callback saat terima message"""
        logger.debug(f"MQTT message received - Topic: {msg.topic}, QoS: {msg.qos}")
        if self.message_handler:
            self.message_handler(msg.topic, msg.payload)
        else:
            logger.warning("No message handler set!")

    def on_disconnect(self, client, userdata, rc):
        """Callback saat disconnect"""
        if rc != 0:
            logger.warning(f"Unexpected disconnect. Code: {rc}")

    def connect(self) -> bool:
        """Connect ke MQTT broker"""
        try:
            self.client.connect(
                settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT, settings.MQTT_KEEPALIVE
            )
            return True
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False

    def start_loop(self):
        """Start listening loop"""
        self.client.loop_forever()

    def stop(self):
        """Stop MQTT client"""
        self.client.disconnect()
        self.client.loop_stop()
