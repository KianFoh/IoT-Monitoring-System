import asyncio
import json
import logging
from typing import Any

from app.core.mqtt_client import MQTTClient
from app.services.device_stream_manager import DeviceStreamManager

RESPONSE_TOPIC_MATCH = "/json/resp/"
RESPONSE_TOPIC_WILDCARDS = [
    "+/json/resp/#",
    "+/+/json/resp/#",
]


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


class DeviceResponseBridge:
    """Bridge MQTT device response topics into live WebSocket streams."""
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
        # Subscribe to device response topics and relay to WS listeners.
        self._mqtt_client.add_message_handler(self._handle_message)
        for topic in RESPONSE_TOPIC_WILDCARDS:
            self._mqtt_client.subscribe(topic)

    def _handle_message(self, topic: str, payload: bytes) -> None:
        if RESPONSE_TOPIC_MATCH not in topic:
            return
        # Expect topics like "<customer>/json/resp/<uid>/" or "<distributor>/<customer>/json/resp/<uid>/"
        parts = [part for part in topic.split("/") if part]
        if len(parts) == 4:
            if parts[1] != "json" or parts[2] != "resp":
                return
        elif len(parts) == 5:
            if parts[2] != "json" or parts[3] != "resp":
                return
        else:
            return
        candidates = [topic]
        if topic.endswith("/"):
            candidates.append(topic.rstrip("/"))
        else:
            candidates.append(f"{topic}/")
        candidates = list(dict.fromkeys(candidates))
        if not any(self._stream_manager.has_connections(candidate) for candidate in candidates):
            return
        message = _parse_payload(payload)
        if not self._loop or self._loop.is_closed():
            logging.warning("Device response websocket loop is not available")
            return
        for candidate in candidates:
            if not self._stream_manager.has_connections(candidate):
                continue
            future = asyncio.run_coroutine_threadsafe(
                self._stream_manager.broadcast(candidate, message),
                self._loop,
            )
            future.add_done_callback(self._log_broadcast_failure)

    @staticmethod
    def _log_broadcast_failure(future: "asyncio.Future[None]") -> None:
        try:
            future.result()
        except Exception as exc:
            logging.error("Failed to broadcast device response: %s", exc)
