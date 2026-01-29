import paho.mqtt.client as mqtt
from app.core.config import settings
from app.utils.logger import logger


class MQTTClient:
    """MQTT Client for receiving data"""

    def __init__(self):
        self.client = mqtt.Client()
        self.on_connect_handler = None

        # Set username and password
        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)

        # Set callbacks
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect

    def set_on_connect_handler(self, handler):
        """Set function to run after a successful connect"""
        self.on_connect_handler = handler

    def on_connect(self, client, userdata, flags, rc):
        """Callback when connected to broker"""
        if rc == 0:
            logger.info("✓ Connected to MQTT Broker")
            # Subscribe to topic
            if self.on_connect_handler:
                try:
                    self.on_connect_handler(client, userdata, flags, rc)
                except Exception as exc:
                    logger.error(f"On-connect handler failed: {exc}")
        else:
            logger.error(f"✗ Failed to connect, code: {rc}")

    def subscribe(self, topic: str):
        """Subscribe to a specific topic"""
        self.client.subscribe(topic)
        logger.info(f"Subscribed to topic: {topic}")
    
    def unsubscribe(self, topic: str):
        """Unsubscribe from a specific topic"""
        self.client.unsubscribe(topic)
        logger.info(f"Unsubscribed from topic: {topic}")

    def message_callback_add(self, sub: str, callback):
        """Add specific callback for a sub-topic"""
        self.client.message_callback_add(sub, callback)

    def message_callback_remove(self, sub: str):
        """Remove specific callback for a sub-topic"""
        self.client.message_callback_remove(sub)

    def publish(self, topic: str, payload: str):
        """Publish message to a specific topic"""
        self.client.publish(topic, payload)
        logger.debug(f"Published message to topic: {topic}")

    def on_disconnect(self, _client, _userdata, rc):
        """Callback when disconnected from broker"""
        if rc != 0:
            logger.warning(f"Unexpected disconnect. Code: {rc}")

    def connect(self) -> bool:
        """Connect to MQTT broker"""
        try:
            self.client.connect(
                settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT, settings.MQTT_KEEPALIVE
            )
            return True
        except Exception as e:
            logger.error(f"Failed to connect: {e}")
            return False

    def start_loop(self):
        """Start MQTT client loop handle auto reconnects block current thread"""
        self.client.loop_forever()

    def stop(self):
        """Stop MQTT client"""
        self.client.disconnect()
