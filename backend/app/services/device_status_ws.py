from typing import Optional, Set, TypedDict
from fastapi import WebSocket

from app.models.enum.user_role import UserRole


class DeviceStatusMeta(TypedDict, total=False):
    role: UserRole
    customer: str
    department: str
    distributor: str


class DeviceStatusConnectionManager:
    """Filter and broadcast device status updates to connected WS clients."""
    def __init__(self) -> None:
        self._connections: Set[WebSocket] = set()
        self._meta: dict[WebSocket, DeviceStatusMeta] = {}

    async def connect(self, websocket: WebSocket, meta: Optional[DeviceStatusMeta] = None) -> None:
        await websocket.accept()
        self._connections.add(websocket)
        if meta is not None:
            self._meta[websocket] = meta

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)
        self._meta.pop(websocket, None)

    def _matches_scope(self, meta: DeviceStatusMeta, scope: Optional[dict[str, str]]) -> bool:
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

    async def broadcast(self, message: dict, scope: Optional[dict[str, str]] = None) -> None:
        # Only send to sockets whose scope matches the status payload.
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
