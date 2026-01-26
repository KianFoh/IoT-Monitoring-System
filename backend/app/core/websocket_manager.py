from typing import Dict, Set
from fastapi import WebSocket


ALLOWED_CHANNELS = {"customer", "distributor", "department", "device", "device_status", "mqtt_user", "user"}


class ConnectionManager:
    def __init__(self) -> None:
        # Map channel name -> set of websockets
        self.active_connections: Dict[str, Set[WebSocket]] = {channel: set() for channel in ALLOWED_CHANNELS}

    async def connect(self, channel: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections[channel].add(websocket)

    def disconnect(self, channel: str, websocket: WebSocket) -> None:
        self.active_connections[channel].discard(websocket)

    async def broadcast(self, channel: str, message: dict) -> None:
        connections = list(self.active_connections.get(channel, []))
        dead: list[WebSocket] = []
        for websocket in connections:
            try:
                await websocket.send_json(message)
            except Exception:
                dead.append(websocket)
        for websocket in dead:
            self.disconnect(channel, websocket)


manager = ConnectionManager()
