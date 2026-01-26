from typing import Any, Dict, Optional, Set
from fastapi import WebSocket

from app.models.enum.user_role import UserRole


class DeviceStatusConnectionManager:
    def __init__(self) -> None:
        self._connections: Set[WebSocket] = set()
        self._meta: Dict[WebSocket, Dict[str, Any]] = {}

    async def connect(self, websocket: WebSocket, meta: Optional[Dict[str, Any]] = None) -> None:
        await websocket.accept()
        self._connections.add(websocket)
        if meta is not None:
            self._meta[websocket] = meta

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)
        self._meta.pop(websocket, None)

    def _matches_scope(self, meta: Dict[str, Any], scope: Optional[Dict[str, str]]) -> bool:
        role = meta.get("role")
        if role == UserRole.superuser:
            return True
        if role != UserRole.user or not scope:
            return False
        if meta.get("customer") != scope.get("customer"):
            return False
        if meta.get("department") != scope.get("department"):
            return False
        distributor = meta.get("distributor")
        if distributor:
            return scope.get("distributor") == distributor
        return not scope.get("distributor")

    async def broadcast(self, message: dict, scope: Optional[Dict[str, str]] = None) -> None:
        connections = list(self._connections)
        dead: list[WebSocket] = []
        for websocket in connections:
            meta = self._meta.get(websocket, {})
            if not self._matches_scope(meta, scope):
                continue
            try:
                await websocket.send_json(message)
            except Exception:
                dead.append(websocket)
        for websocket in dead:
            self.disconnect(websocket)


device_status_ws_manager = DeviceStatusConnectionManager()
