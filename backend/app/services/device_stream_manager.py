import threading
from typing import Dict, Set

from fastapi import WebSocket


class DeviceStreamManager:
    """Thread-safe topic -> websocket connection registry for device streams."""
    def __init__(self) -> None:
        self._connections: Dict[str, Set[WebSocket]] = {}
        self._lock = threading.Lock()

    async def connect(self, topic: str, websocket: WebSocket) -> None:
        await websocket.accept()
        with self._lock:
            self._connections.setdefault(topic, set()).add(websocket)

    def disconnect(self, topic: str, websocket: WebSocket) -> None:
        with self._lock:
            connections = self._connections.get(topic)
            if not connections:
                return
            connections.discard(websocket)
            if not connections:
                self._connections.pop(topic, None)

    def has_connections(self, topic: str) -> bool:
        with self._lock:
            return bool(self._connections.get(topic))

    async def broadcast(self, topic: str, message: dict) -> None:
        with self._lock:
            connections = list(self._connections.get(topic, set()))
        if not connections:
            return
        # Remove sockets that raise during send_json (client closed or network error).
        dead: list[WebSocket] = []
        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception:
                dead.append(websocket)
        if not dead:
            return
        with self._lock:
            current = self._connections.get(topic)
            if not current:
                return
            for websocket in dead:
                current.discard(websocket)
            if not current:
                self._connections.pop(topic, None)
