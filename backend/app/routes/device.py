from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.crud.postgres import device as device_crud
from app.crud.postgres import department as department_crud
from app.crud.mongodb import devices_data as device_data_crud
from app.models.user import User as UserModel
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceOut, DeviceRecentOut, DeviceListResponse
from app.models.enum.user_role import UserRole
from app.utils.mongodb import serialize_document
from app.utils.ws_events import broadcast_device_event

router = APIRouter(prefix="/devices", tags=["devices"])
DEVICE_EVENT_PREFIX = "internal/devices/events"


def _normalize_topic_name(value: str) -> str:
    return (value or "").strip().lower()


def _build_device_event_topic(
    customer_name: str,
    department_name: str,
    device_uid: str,
    distributor_name: str | None = None,
) -> str:
    normalized_customer = _normalize_topic_name(customer_name)
    normalized_department = _normalize_topic_name(department_name)
    normalized_distributor = _normalize_topic_name(distributor_name) if distributor_name else ""
    if normalized_distributor:
        return f"{DEVICE_EVENT_PREFIX}/{normalized_distributor}/{normalized_customer}/{normalized_department}/{device_uid}/"
    return f"{DEVICE_EVENT_PREFIX}/{normalized_customer}/{normalized_department}/{device_uid}/"


def _publish_device_event(
    request: Request,
    customer_name: str,
    department_name: str,
    payload: dict,
    distributor_name: str | None = None,
) -> None:
    mqtt_client = getattr(request.app.state, "mqtt_client", None)
    if not mqtt_client:
        return
    payload_to_send = dict(payload)
    normalized_customer = _normalize_topic_name(customer_name)
    normalized_department = _normalize_topic_name(department_name)
    payload_to_send["customer_name"] = normalized_customer
    payload_to_send["department_name"] = normalized_department
    if distributor_name:
        payload_to_send["distributor_name"] = _normalize_topic_name(distributor_name)
    mqtt_client.publish(
        _build_device_event_topic(
            normalized_customer,
            normalized_department,
            payload_to_send.get("uid"),
            distributor_name,
        ),
        payload_to_send,
    )

# ==================== Count ====================
@router.get("/count", response_model=int)
def count_devices(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Count total number of devices."""
    require_role(current_user, [UserRole.superuser])
    
    device_count = device_crud.count_devices(db)
    return device_count

# ==================== Recent Devices ====================
@router.get("/recent", response_model=List[DeviceRecentOut])
def get_recent_devices(
    limit: int = Query(5, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get most recently added devices."""
    require_role(current_user, [UserRole.superuser])

    recent_devices = device_crud.get_recent_devices(db, limit=limit)
    return recent_devices

# ==================== Create ====================
@router.post("/", response_model=DeviceOut, status_code=status.HTTP_201_CREATED)
async def create_device(
    device: DeviceCreate,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new device"""
    require_role(current_user, [UserRole.superuser])
    
    # Check if device already exists
    existing_device = device_crud.get_device_by_uid(db, device.uid)
    if existing_device:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Device with this UID already exists"
        )
    
    department = department_crud.get_department(db, device.department_id)
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    db_device = device_crud.create_device(db, device)
    device_out = device_crud.get_device_with_relations(db, db_device.id) or DeviceOut.model_validate(
        db_device, from_attributes=True
    )
    await broadcast_device_event("add", device_out)
    _publish_device_event(
        request,
        device_out.customer_name,
        device_out.department_name,
        {
            "uid": device_out.uid,
            "event_type": "add",
            "customer_name": device_out.customer_name,
            "department_name": device_out.department_name,
            "data_interval": device_out.data_interval,
            "is_active": device_out.is_active,
        },
        device_out.distributor_name,
    )
    return device_out


# ==================== Read (List) ====================
@router.get("/", response_model=DeviceListResponse)
def get_devices(
    search: Optional[str] = Query(None, description="Search by UID, device name, department or customer"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get devices with pagination and search."""
    require_role(current_user, [UserRole.superuser, UserRole.user])

    department_id = None
    if current_user.role == UserRole.user:
        department_id = current_user.department_id
        if not department_id:
            return DeviceListResponse(
                items=[],
                total=0,
                page=page,
                page_size=page_size,
            )

    include_customer_name = current_user.role == UserRole.superuser
    include_department_name = False
    include_machine_name = current_user.role == UserRole.user

    items, total = device_crud.get_devices(
        db,
        search=search.strip() if search else None,
        page=page,
        page_size=page_size,
        department_id=department_id,
        include_customer_name=include_customer_name,
        include_department_name=include_department_name,
        include_machine_name=include_machine_name,
    )
    return DeviceListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )

# ==================== Read (Single) ====================
@router.get("/{device_id}", response_model=DeviceOut)
def get_device(
    device_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get device by ID."""
    require_role(current_user, [UserRole.superuser])

    device = device_crud.get_device_with_relations(db, device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    return device

# ==================== Update ====================
@router.patch("/{device_id}", response_model=DeviceOut)
async def update_device(
    device_id: int,
    device_update: DeviceUpdate,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update device"""
    require_role(current_user, [UserRole.superuser, UserRole.user])
    
    # Check if device exists
    existing_device = device_crud.get_device(db, device_id)
    if not existing_device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )

    if current_user.role == UserRole.user:
        if existing_device.department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to update this device",
            )
        update_data = device_update.model_dump(exclude_unset=True)
        if update_data:
            forbidden = [field for field in update_data.keys() if field != "machine"]
            if forbidden:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only update the machine name",
                )
            updated_device = device_crud.update_device(
                db,
                existing_device,
                DeviceUpdate(machine=device_update.machine),
            )
        else:
            updated_device = existing_device

        device_out = device_crud.get_device_with_relations(db, device_id) or DeviceOut.model_validate(
            updated_device, from_attributes=True
        )
        await broadcast_device_event("update", device_out)
        _publish_device_event(
            request,
            device_out.customer_name,
            device_out.department_name,
            {
                "uid": device_out.uid,
                "event_type": "update",
                "customer_name": device_out.customer_name,
                "department_name": device_out.department_name,
                "data_interval": device_out.data_interval,
                "is_active": device_out.is_active,
                "restart_pipeline": False,
            },
            device_out.distributor_name,
        )
        return device_out

    restart_pipeline = False
    if device_update.data_interval is not None and device_update.data_interval != existing_device.data_interval:
        restart_pipeline = True
    if device_update.is_active is not None and device_update.is_active != existing_device.is_active:
        restart_pipeline = True
    
    # If department_id is being updated, check if the new department exists
    if device_update.department_id:
        department = department_crud.get_department(db, device_update.department_id)
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )
    updated_device = device_crud.update_device(db, existing_device, device_update)
    device_out = device_crud.get_device_with_relations(db, device_id) or DeviceOut.model_validate(
        updated_device, from_attributes=True
    )
    await broadcast_device_event("update", device_out)
    _publish_device_event(
        request,
        device_out.customer_name,
        device_out.department_name,
        {
            "uid": device_out.uid,
            "event_type": "update",
            "customer_name": device_out.customer_name,
            "department_name": device_out.department_name,
            "data_interval": device_out.data_interval,
            "is_active": device_out.is_active,
            "restart_pipeline": restart_pipeline,
        },
        device_out.distributor_name,
    )
    return device_out

# ==================== Delete ====================
@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_device(
    device_id: int,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete device"""
    require_role(current_user, [UserRole.superuser])
    
    # Check if device exists
    device = device_crud.get_device(db, device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    device_out = device_crud.get_device_with_relations(db, device_id)
    device_crud.delete_device(db, device_id)
    if device_out:
        await broadcast_device_event("delete", device_out)
    else:
        await broadcast_device_event("delete", {"id": device_id})
    customer_name = device_out.customer_name if device_out else ""
    department_name = device_out.department_name if device_out else ""
    uid = device_out.uid if device_out else device.uid
    _publish_device_event(
        request,
        customer_name,
        department_name,
        {
            "uid": uid,
            "event_type": "delete",
            "customer_name": customer_name,
            "department_name": department_name,
            "data_interval": device_out.data_interval if device_out else None,
            "is_active": device_out.is_active if device_out else None,
        },
        device_out.distributor_name if device_out else None,
    )

# ==================== Fetch Device Data =====================
@router.get("/data/{device_uid}/latest", response_model=Optional[dict])
def fetch_device_latest_data(
    device_uid: str,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch the latest data snapshot for a specific device by UID."""
    require_role(current_user, [UserRole.superuser, UserRole.user])

    device = device_crud.get_device_by_uid(db, device_uid)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    if current_user.role == UserRole.user:
        if device.department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this device's data"
            )

    data = device_data_crud.get_latest_by_uid(device_uid)
    if not data:
        return None
    return serialize_document(data)


@router.get("/data/{device_uid}")
def fetch_device_data(
    device_uid: str,
    granularity: Optional[str] = Query(None, description="sec, minute, hour, day, week, month, year"),
    granuality: Optional[str] = Query(None, include_in_schema=False),
    start: Optional[datetime] = Query(None, description="ISO 8601 start datetime"),
    end: Optional[datetime] = Query(None, description="ISO 8601 end datetime"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch data for a specific device by UID."""
    require_role(current_user, [UserRole.superuser, UserRole.user])
    
    device = device_crud.get_device_by_uid(db, device_uid)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    if current_user.role == UserRole.user:
        if device.department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this device's data"
            )
    selected_granularity = (granularity or granuality or "").strip().lower() or None
    if selected_granularity and selected_granularity not in {
        "sec",
        "second",
        "minute",
        "hour",
        "day",
        "week",
        "month",
        "year",
    }:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid granularity. Use sec, minute, hour, day, week, month, or year.",
        )
    if start and end and start > end:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start must be before end",
        )

    data = device_data_crud.get_by_uid(
        device_uid,
        start=start,
        end=end,
        granularity=selected_granularity,
    )
    if not data:
        return []
    data = [serialize_document(doc) for doc in data]
    return data
