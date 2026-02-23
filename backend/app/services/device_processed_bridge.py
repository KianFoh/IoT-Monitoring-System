import asyncio
import json
import logging
from typing import Any

from app.core.mqtt_client import MQTTClient
from app.services.device_stream_manager import DeviceStreamManager

PROCESSED_TOPIC_PREFIX = "internal/devices/processed"
PROCESSED_TOPIC_WILDCARD = f"{PROCESSED_TOPIC_PREFIX}/#"


def _parse_payload(payload: bytes) -> dict:
    text = payload.decode("utf-8", errors="ignore").strip()
    if not text:
        return {"raw": ""}
    try:
        data: Any = json.loads(text)
        if isinstance(data, dict):
            return data
        return {"data": data}
    except json.JSONDecodeError:
        return {"raw": text}


class DeviceProcessedBridge:
    """Bridge MQTT 'processed device data' topics into live WebSocket streams."""
    def __init__(
        self,
        mqtt_client: MQTTClient,
        loop: asyncio.AbstractEventLoop,
        stream_manager: DeviceStreamManager,
    ) -> None:
        self._mqtt_client = mqtt_client
        self._loop = loop
        self._stream_manager = stream_manager

    def start(self) -> None:
        # Subscribe to all processed device topics and relay to WS listeners.
        self._mqtt_client.add_message_handler(self._handle_message)
        self._mqtt_client.subscribe(PROCESSED_TOPIC_WILDCARD)

    def _handle_message(self, topic: str, payload: bytes) -> None:
        if not topic.startswith(f"{PROCESSED_TOPIC_PREFIX}/"):
            return
        if not self._stream_manager.has_connections(topic):
            return
        message = _parse_payload(payload)
        if not self._loop or self._loop.is_closed():
            logging.warning("Device processed websocket loop is not available")
            return
        future = asyncio.run_coroutine_threadsafe(
            self._stream_manager.broadcast(topic, message),
            self._loop,
        )
        future.add_done_callback(self._log_broadcast_failure)

    @staticmethod
    def _log_broadcast_failure(future: "asyncio.Future[None]") -> None:
        try:
            future.result()
        except Exception as exc:
            logging.error("Failed to broadcast device processed data: %s", exc)
