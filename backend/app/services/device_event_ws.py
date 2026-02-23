from typing import Any, Optional, Set, TypedDict
from fastapi import WebSocket

from app.models.enum.user_role import UserRole


class DeviceEventMeta(TypedDict, total=False):
    role: UserRole
    customer: str
    department: str
    distributor: str


class DeviceEventConnectionManager:
    def __init__(self) -> None:
        self._connections: Set[WebSocket] = set()
        self._meta: dict[WebSocket, DeviceEventMeta] = {}

    async def connect(self, websocket: WebSocket, meta: Optional[DeviceEventMeta] = None) -> None:
        await websocket.accept()
        self._connections.add(websocket)
        if meta is not None:
            self._meta[websocket] = meta

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections.discard(websocket)
        self._meta.pop(websocket, None)

    @staticmethod
    def _normalize(value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        normalized = str(value).strip().lower()
        return normalized or None

    def _extract_scope(self, payload: dict) -> Optional[dict[str, Optional[str]]]:
        customer = self._normalize(payload.get("customer_name"))
        department = self._normalize(payload.get("department_name"))
        distributor = self._normalize(payload.get("distributor_name"))
        if not customer or not department:
            return None
        return {
            "customer": customer,
            "department": department,
            "distributor": distributor,
        }

    def _matches_scope(self, meta: DeviceEventMeta, scope: Optional[dict[str, Optional[str]]]) -> bool:
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

    async def broadcast(self, message: dict) -> None:
        payload = message.get("data")
        scope = self._extract_scope(payload) if isinstance(payload, dict) else None
        # Only send to sockets whose scope matches the event payload.
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


device_event_ws_manager = DeviceEventConnectionManager()
