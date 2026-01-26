import asyncio
import json
import logging
from typing import Optional, Tuple

from app.core.mqtt_client import MQTTClient
from app.services.device_stream_manager import DeviceStreamManager
from app.utils.ws_events import broadcast_device_status_event

STATUS_TOPIC_PREFIX = "internal/devices/status"
STATUS_TOPIC_WILDCARD = f"{STATUS_TOPIC_PREFIX}/#"


def _parse_status_topic(topic: str) -> Tuple[Optional[str], Optional[str]]:
    parts = [part for part in topic.split("/") if part]
    if len(parts) < 6:
        return None, None
    if parts[0] != "internal" or parts[1] != "devices" or parts[2] != "status":
        return None, None
    if len(parts) >= 7:
        distributor = parts[3]
        customer = parts[4]
        return f"{distributor}/{customer}", parts[-1]
    return parts[3], parts[-1]


def _parse_status_payload(payload: bytes) -> str:
    text = payload.decode("utf-8", errors="ignore").strip()
    if not text:
        return "unknown"
    try:
        data = json.loads(text)
        if isinstance(data, dict) and "status" in data:
            return str(data.get("status", "unknown")).lower()
    except json.JSONDecodeError:
        pass
    return text.lower()


class DeviceStatusBridge:
    def __init__(
        self,
        mqtt_client: MQTTClient,
        loop: asyncio.AbstractEventLoop,
        stream_manager: DeviceStreamManager | None = None,
    ) -> None:
        self._mqtt_client = mqtt_client
        self._loop = loop
        self._stream_manager = stream_manager

    def start(self) -> None:
        self._mqtt_client.add_message_handler(self._handle_message)
        self._mqtt_client.subscribe(STATUS_TOPIC_WILDCARD)
        logging.info("Subscribed to device status topic: %s", STATUS_TOPIC_WILDCARD)

    def _handle_message(self, topic: str, payload: bytes) -> None:
        customer_path, device_uid = _parse_status_topic(topic)
        if not customer_path or not device_uid:
            return
        status = _parse_status_payload(payload)
        message = {
            "uid": device_uid,
            "status": status,
        }
        if not self._loop or self._loop.is_closed():
            logging.warning("Device status websocket loop is not available")
            return
        future = asyncio.run_coroutine_threadsafe(
            broadcast_device_status_event("status", message),
            self._loop,
        )
        future.add_done_callback(self._log_broadcast_failure)
        if self._stream_manager:
            device_key = f"{customer_path}/{device_uid}"
            if self._stream_manager.has_connections(device_key):
                future = asyncio.run_coroutine_threadsafe(
                    self._stream_manager.broadcast(device_key, message),
                    self._loop,
                )
                future.add_done_callback(self._log_broadcast_failure)

    @staticmethod
    def _log_broadcast_failure(future: "asyncio.Future[None]") -> None:
        try:
            future.result()
        except Exception as exc:
            logging.error("Failed to broadcast device status: %s", exc)
