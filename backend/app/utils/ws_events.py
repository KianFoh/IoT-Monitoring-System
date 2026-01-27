from typing import Any

from pydantic import BaseModel

from app.core.websocket_manager import manager
from app.schemas.customer import CustomerOut
from app.schemas.department import DepartmentOut
from app.schemas.distributor import DistributorOut
from app.schemas.device import DeviceOut
from app.schemas.mqtt_user import MqttUserOut
from app.schemas.user import UserOut
from app.services.device_event_ws import device_event_ws_manager
from app.services.device_status_ws import device_status_ws_manager


def _serialize(payload: Any) -> dict:
    """Convert Pydantic models to JSON-ready dicts and pass through dicts."""
    if isinstance(payload, BaseModel):
        return payload.model_dump(mode="json")
    if isinstance(payload, dict):
        return payload
    raise TypeError("Unsupported payload type for websocket broadcast")


async def broadcast_customer_event(event_type: str, customer: CustomerOut):
    await manager.broadcast(
        "customer",
        {"type": event_type, "data": _serialize(customer)},
    )


async def broadcast_distributor_event(event_type: str, distributor: DistributorOut):
    await manager.broadcast(
        "distributor",
        {"type": event_type, "data": _serialize(distributor)},
    )


async def broadcast_department_event(event_type: str, department: DepartmentOut):
    await manager.broadcast(
        "department",
        {"type": event_type, "data": _serialize(department)},
    )


async def broadcast_device_event(event_type: str, device: DeviceOut):
    await device_event_ws_manager.broadcast(
        {"type": event_type, "data": _serialize(device)},
    )


async def broadcast_device_status_event(event_type: str, payload: dict, scope: dict | None = None):
    await device_status_ws_manager.broadcast(
        {"type": event_type, "data": _serialize(payload)},
        scope=scope,
    )


async def broadcast_mqtt_user_event(event_type: str, mqtt_user: MqttUserOut):
    await manager.broadcast(
        "mqtt_user",
        {"type": event_type, "data": _serialize(mqtt_user)},
    )


async def broadcast_user_event(event_type: str, user: UserOut):
    await manager.broadcast(
        "user",
        {"type": event_type, "data": _serialize(user)},
    )
