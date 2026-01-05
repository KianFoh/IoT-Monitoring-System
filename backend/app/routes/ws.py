from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.websocket_manager import ALLOWED_CHANNELS, manager
from app.core.security import decode_token
from app.core.database import SessionLocal
from app.models.user import User
from app.models.enum.user_role import UserRole


router = APIRouter()

# Channel -> allowed roles (currently superuser only)
CHANNEL_ROLES = {channel: {UserRole.superuser} for channel in ALLOWED_CHANNELS}


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


@router.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    if channel not in ALLOWED_CHANNELS:
        # Reject unknown channels
        await websocket.close(code=4000)
        return

    user = await authenticate_websocket(websocket, channel)
    if not user:
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