import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.websocket_manager import ALLOWED_CHANNELS, manager
from app.core.security import decode_token
from app.core.database import SessionLocal
from app.models.user import User
from app.models.department import Department
from app.models.customer import Customer
from app.models.distributor import Distributor
from app.crud.postgres import device as device_crud
from app.models.enum.user_role import UserRole
from app.services.device_status_ws import device_status_ws_manager
from app.services.device_event_ws import device_event_ws_manager


router = APIRouter()

# Channel -> allowed roles
CHANNEL_ROLES = {channel: {UserRole.superuser} for channel in ALLOWED_CHANNELS}
CHANNEL_ROLES["device_status"] = {UserRole.superuser, UserRole.user}
CHANNEL_ROLES["device"] = {UserRole.superuser, UserRole.user}

'''
 Error codes:
    WS_INVALID_CHANNEL = 4400
    WS_UNAUTHORIZED   = 4401
    WS_FORBIDDEN      = 4403
'''

async def authenticate_websocket(websocket: WebSocket, channel: str):
    """Validate JWT from Authorization header or ?token= and role per channel."""
    token = None
    auth_header = websocket.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1]
    if not token:
        token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=4401)
        return None

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4401)
        return None

    user_id = payload.get("sub")
    try:
        user_id_int = int(user_id)
    except Exception:
        await websocket.close(code=4401)
        return None

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id_int).first()
    finally:
        db.close()

    if not user or not user.is_active:
        await websocket.close(code=4401)
        return None

    allowed_roles = CHANNEL_ROLES.get(channel)
    if allowed_roles and user.role not in allowed_roles:
        await websocket.close(code=4403)
        return None

    return user


async def authenticate_websocket_with_roles(websocket: WebSocket, allowed_roles: set[UserRole]):
    """Validate JWT from Authorization header or ?token= and role set."""
    token = None
    auth_header = websocket.headers.get("authorization")
    if auth_header and auth_header.lower().startswith("bearer "):
        token = auth_header.split(" ", 1)[1]
    if not token:
        token = websocket.query_params.get("token")

    if not token:
        await websocket.close(code=4401)
        return None

    payload = decode_token(token)
    if not payload or payload.get("type") != "access":
        await websocket.close(code=4401)
        return None

    user_id = payload.get("sub")
    try:
        user_id_int = int(user_id)
    except Exception:
        await websocket.close(code=4401)
        return None

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.id == user_id_int).first()
    finally:
        db.close()

    if not user or not user.is_active:
        await websocket.close(code=4401)
        return None

    if user.role not in allowed_roles:
        await websocket.close(code=4403)
        return None

    return user


def _normalize_topic_name(value: str | None) -> str:
    return (value or "").strip().lower()


def _build_device_response_topic(
    customer_name: str,
    device_uid: str,
    distributor_name: str | None = None,
) -> str:
    normalized_customer = _normalize_topic_name(customer_name)
    normalized_distributor = _normalize_topic_name(distributor_name) if distributor_name else ""
    if normalized_distributor:
        return f"{normalized_distributor}/{normalized_customer}/json/resp/{device_uid}/"
    return f"{normalized_customer}/json/resp/{device_uid}/"


def _build_device_command_topic(
    customer_name: str,
    device_uid: str,
    distributor_name: str | None = None,
) -> str:
    normalized_customer = _normalize_topic_name(customer_name)
    normalized_distributor = _normalize_topic_name(distributor_name) if distributor_name else ""
    if normalized_distributor:
        return f"{normalized_distributor}/{normalized_customer}/cmd/{device_uid}/"
    return f"{normalized_customer}/cmd/{device_uid}/"


def _build_device_receive_topic(
    customer_name: str,
    device_uid: str,
    distributor_name: str | None = None,
) -> str:
    normalized_customer = _normalize_topic_name(customer_name)
    normalized_distributor = _normalize_topic_name(distributor_name) if distributor_name else ""
    if normalized_distributor:
        return f"{normalized_distributor}/{normalized_customer}/json/receive/{device_uid}/"
    return f"{normalized_customer}/json/receive/{device_uid}/"


def _resolve_device_publish_topic(
    fallback_topic: str,
    custom_topic: str | None,
) -> str:
    custom = (custom_topic or "").strip()
    return custom or fallback_topic


@router.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    if channel not in ALLOWED_CHANNELS:
        # Reject unknown channels
        await websocket.close(code=4000)
        return

    user = await authenticate_websocket(websocket, channel)
    if not user:
        return
    if channel in {"device_status", "device"}:
        meta = {"role": user.role}
        if user.role == UserRole.user:
            if not user.department_id:
                await websocket.close(code=4403)
                return
            db = SessionLocal()
            try:
                row = (
                    db.query(
                        Department.name.label("department_name"),
                        Customer.name.label("customer_name"),
                        Distributor.name.label("distributor_name"),
                    )
                    .join(Customer, Department.customer_id == Customer.id)
                    .outerjoin(Distributor, Customer.distributor_id == Distributor.id)
                    .filter(Department.id == user.department_id)
                    .first()
                )
            finally:
                db.close()
            if not row:
                await websocket.close(code=4404)
                return
            department_name, customer_name, distributor_name = row
            meta.update(
                {
                    "department": (department_name or "").strip().lower(),
                    "customer": (customer_name or "").strip().lower(),
                    "distributor": (distributor_name or "").strip().lower() if distributor_name else None,
                }
            )

        manager_to_use = device_status_ws_manager if channel == "device_status" else device_event_ws_manager
        await manager_to_use.connect(websocket, meta=meta)
        try:
            while True:
                await websocket.receive_text()
        except WebSocketDisconnect:
            manager_to_use.disconnect(websocket)
        except Exception:
            manager_to_use.disconnect(websocket)
            await websocket.close()
        return

    await manager.connect(channel, websocket)
    try:
        # Keep the connection alive; we don't expect messages from clients now
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(channel, websocket)
    except Exception:
        manager.disconnect(channel, websocket)
        await websocket.close()


@router.websocket("/ws/devices/{customer_name}/{department_name}/{device_uid}")
async def device_stream_websocket(
    websocket: WebSocket,
    customer_name: str,
    department_name: str,
    device_uid: str,
):
    user = await authenticate_websocket_with_roles(websocket, {UserRole.superuser, UserRole.user})
    if not user:
        return

    stream_manager = getattr(websocket.app.state, "device_stream_manager", None)
    if not stream_manager:
        await websocket.close(code=1011)
        return
    db = SessionLocal()
    try:
        device = device_crud.get_device_with_relations_by_uid(db, device_uid)
        device_record = device_crud.get_device_by_uid(db, device_uid)
    finally:
        db.close()
    if not device or not device_record:
        await websocket.close(code=4404)
        return

    if user.role == UserRole.user:
        if not user.department_id:
            await websocket.close(code=4403)
            return
        if device_record.department_id != user.department_id:
            await websocket.close(code=4403)
            return

    distributor = (device.distributor_name or "").strip().lower()
    customer = (device.customer_name or "").strip().lower()
    department = (device.department_name or "").strip().lower()
    if distributor:
        topic = f"internal/devices/processed/{distributor}/{customer}/{department}/{device_uid}/"
    else:
        topic = f"internal/devices/processed/{customer}/{department}/{device_uid}/"

    await stream_manager.connect(topic, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        stream_manager.disconnect(topic, websocket)
    except Exception:
        stream_manager.disconnect(topic, websocket)
        await websocket.close()


@router.websocket("/ws/devices/{customer_name}/{department_name}/{device_uid}/resp")
async def device_response_websocket(
    websocket: WebSocket,
    customer_name: str,
    department_name: str,
    device_uid: str,
):
    user = await authenticate_websocket_with_roles(websocket, {UserRole.superuser, UserRole.user})
    if not user:
        return

    stream_manager = getattr(websocket.app.state, "device_stream_manager", None)
    if not stream_manager:
        await websocket.close(code=1011)
        return
    db = SessionLocal()
    try:
        device = device_crud.get_device_with_relations_by_uid(db, device_uid)
        device_record = device_crud.get_device_by_uid(db, device_uid)
    finally:
        db.close()
    if not device or not device_record:
        await websocket.close(code=4404)
        return

    if user.role == UserRole.user:
        if not user.department_id:
            await websocket.close(code=4403)
            return
        if device_record.department_id != user.department_id:
            await websocket.close(code=4403)
            return

    topic = _build_device_response_topic(
        device.customer_name or "",
        device_record.uid,
        device.distributor_name,
    )

    await stream_manager.connect(topic, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        stream_manager.disconnect(topic, websocket)
    except Exception:
        stream_manager.disconnect(topic, websocket)
        await websocket.close()


@router.websocket("/ws/devices/{customer_name}/{department_name}/{device_uid}/cmd")
async def device_command_websocket(
    websocket: WebSocket,
    customer_name: str,
    department_name: str,
    device_uid: str,
):
    user = await authenticate_websocket_with_roles(websocket, {UserRole.superuser, UserRole.user})
    if not user:
        return

    mqtt_client = getattr(websocket.app.state, "mqtt_client", None)
    if not mqtt_client:
        await websocket.close(code=1011)
        return

    db = SessionLocal()
    try:
        device = device_crud.get_device_with_relations_by_uid(db, device_uid)
        device_record = device_crud.get_device_by_uid(db, device_uid)
    finally:
        db.close()
    if not device or not device_record:
        await websocket.close(code=4404)
        return

    if user.role == UserRole.user:
        if not user.department_id:
            await websocket.close(code=4403)
            return
        if device_record.department_id != user.department_id:
            await websocket.close(code=4403)
            return

    topic = _resolve_device_publish_topic(
        _build_device_command_topic(
            device.customer_name or "",
            device_record.uid,
            device.distributor_name,
        ),
        device_record.pub,
    )

    await websocket.accept()
    try:
        while True:
            text = await websocket.receive_text()
            if not text.strip():
                continue
            payload_dict = None
            try:
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    payload_dict = parsed
            except json.JSONDecodeError:
                payload_dict = None
            if payload_dict is not None:
                mqtt_client.publish(topic, payload_dict)
            else:
                mqtt_client.publish_raw(topic, text)
    except WebSocketDisconnect:
        return
    except Exception:
        await websocket.close()


@router.websocket("/ws/devices/{customer_name}/{department_name}/{device_uid}/receive")
async def device_receive_websocket(
    websocket: WebSocket,
    customer_name: str,
    department_name: str,
    device_uid: str,
):
    user = await authenticate_websocket_with_roles(websocket, {UserRole.superuser, UserRole.user})
    if not user:
        return

    mqtt_client = getattr(websocket.app.state, "mqtt_client", None)
    if not mqtt_client:
        await websocket.close(code=1011)
        return

    db = SessionLocal()
    try:
        device = device_crud.get_device_with_relations_by_uid(db, device_uid)
        device_record = device_crud.get_device_by_uid(db, device_uid)
    finally:
        db.close()
    if not device or not device_record:
        await websocket.close(code=4404)
        return

    if user.role == UserRole.user:
        if not user.department_id:
            await websocket.close(code=4403)
            return
        if device_record.department_id != user.department_id:
            await websocket.close(code=4403)
            return

    topic = _resolve_device_publish_topic(
        _build_device_receive_topic(
            device.customer_name or "",
            device_record.uid,
            device.distributor_name,
        ),
        device_record.pub,
    )

    await websocket.accept()
    try:
        while True:
            text = await websocket.receive_text()
            if not text.strip():
                continue
            payload_dict = None
            try:
                parsed = json.loads(text)
                if isinstance(parsed, dict):
                    payload_dict = parsed
            except json.JSONDecodeError:
                payload_dict = None
            if payload_dict is not None:
                mqtt_client.publish(topic, payload_dict)
            else:
                mqtt_client.publish_raw(topic, text)
    except WebSocketDisconnect:
        return
    except Exception:
        await websocket.close()
