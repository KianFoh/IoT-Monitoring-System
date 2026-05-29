import json
import logging
from typing import Callable

import paho.mqtt.client as mqtt

from app.config import settings

logger = logging.getLogger(__name__)


class MQTTClient:
    def __init__(
        self,
        on_processed_message: Callable[[str, dict], None],
        on_rule_message: Callable[[str, dict], None],
    ) -> None:
        self._on_processed_message = on_processed_message
        self._on_rule_message = on_rule_message
        self.client = mqtt.Client()

        if settings.MQTT_USERNAME and settings.MQTT_PASSWORD:
            self.client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)

        self.client.on_connect = self._on_connect
        self.client.on_disconnect = self._on_disconnect
        self.client.message_callback_add(settings.ALERT_PROCESSED_TOPIC, self._handle_processed)
        self.client.message_callback_add(settings.ALERT_RULE_TOPIC, self._handle_rule)

    def connect(self) -> None:
        self.client.connect(
            settings.MQTT_BROKER_HOST,
            settings.MQTT_BROKER_PORT,
            settings.MQTT_KEEPALIVE,
        )

    def loop_forever(self) -> None:
        self.client.loop_forever()

    def disconnect(self) -> None:
        self.client.disconnect()

    def _on_connect(self, client, _userdata, _flags, rc) -> None:
        if rc != 0:
            logger.error("Failed to connect to MQTT broker, code=%s", rc)
            return

        logger.info("Connected to MQTT broker")
        client.subscribe(settings.ALERT_PROCESSED_TOPIC)
        client.subscribe(settings.ALERT_RULE_TOPIC)
        logger.info("Subscribed to %s", settings.ALERT_PROCESSED_TOPIC)
        logger.info("Subscribed to %s", settings.ALERT_RULE_TOPIC)

    def _on_disconnect(self, _client, _userdata, rc) -> None:
        if rc != 0:
            logger.warning("Unexpected MQTT disconnect, code=%s", rc)

    def _handle_processed(self, _client, _userdata, message) -> None:
        payload = self._parse_json(message.payload)
        if payload is None:
            return
        self._on_processed_message(message.topic, payload)

    def _handle_rule(self, _client, _userdata, message) -> None:
        payload = self._parse_json(message.payload)
        if payload is None:
            return
        self._on_rule_message(message.topic, payload)

    def _parse_json(self, payload: bytes) -> dict | None:
        try:
            parsed = json.loads(payload.decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError):
            logger.warning("Invalid MQTT JSON payload")
            return None
        if not isinstance(parsed, dict):
            logger.warning("Ignoring non-object MQTT payload")
            return None
        return parsed
