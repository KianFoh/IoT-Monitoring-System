import json
import logging
import time
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from threading import Lock
from typing import Dict, List, Optional, Tuple
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.crud.postgres import device as device_crud
from app.crud.postgres import department as department_crud
from app.crud.mongodb import devices_data as device_data_crud
from app.models.user import User as UserModel
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceOut, DeviceRecentOut, DeviceListResponse
from app.models.enum.user_role import UserRole
from app.utils.device_data import (
    extract_panel_fields_and_config,
    normalize_field_type,
)
from app.utils.device_events import publish_device_event
from app.utils.mongodb import serialize_document
from app.utils.ws_events import broadcast_device_event

router = APIRouter(prefix="/devices", tags=["devices"])
logger = logging.getLogger(__name__)
_field_config_cache: Dict[Tuple[str, str], Tuple[List[str], Dict[str, str]]] = {}
_field_config_cache_lock = Lock()


def _normalize_datetime(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def _get_cached_panel_fields_and_types(
    device_uid: str,
    dashboard_config: Optional[dict],
) -> Tuple[List[str], Dict[str, str]]:
    if not isinstance(dashboard_config, dict):
        return [], {}

    cache_key = (
        device_uid,
        json.dumps(dashboard_config, sort_keys=True, separators=(",", ":"), default=str),
    )
    with _field_config_cache_lock:
        cached = _field_config_cache.get(cache_key)
    if cached is not None:
        return cached

    panel_fields, panel_config = extract_panel_fields_and_config(dashboard_config)
    field_types = {
        field: normalize_field_type(
            panel_config.get(field, {}).get("type")
            if isinstance(panel_config.get(field, {}), dict)
            else None
        )
        for field in panel_fields
    }
    value = (panel_fields, field_types)
    with _field_config_cache_lock:
        _field_config_cache[cache_key] = value
        if len(_field_config_cache) > 512:
            _field_config_cache.pop(next(iter(_field_config_cache)))
    return value

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
    publish_device_event(
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
        publish_device_event(
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

    # Check if dashboard_config.data_panel is being updated and changed
    if device_update.dashboard_config is not None:
        old_panel = (existing_device.dashboard_config or {}).get("data_panel") if isinstance(existing_device.dashboard_config, dict) else None
        new_panel = (device_update.dashboard_config or {}).get("data_panel") if isinstance(device_update.dashboard_config, dict) else None
        if old_panel != new_panel:
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
    publish_device_event(
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
    publish_device_event(
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
    granularity: str = Query(..., description="sec, minute, hour, day, week, month, year"),
    start: Optional[datetime] = Query(None, description="ISO 8601 start datetime"),
    end: Optional[datetime] = Query(None, description="ISO 8601 end datetime"),
    tz_offset: Optional[int] = Query(
        None,
        description="Timezone offset in minutes (JS Date.getTimezoneOffset)",
    ),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch data for a specific device by UID."""
    started_at = time.perf_counter()
    timings: Dict[str, float] = {}

    def mark(stage: str, stage_started_at: float) -> float:
        now = time.perf_counter()
        timings[stage] = round((now - stage_started_at) * 1000, 2)
        return now

    stage_started_at = started_at
    require_role(current_user, [UserRole.superuser, UserRole.user])

    device = device_crud.get_device_by_uid(db, device_uid)
    stage_started_at = mark("device_lookup_ms", stage_started_at)
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

    selected_granularity = granularity.strip().lower()
    if selected_granularity not in {
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

    panel_fields, field_types = _get_cached_panel_fields_and_types(device_uid, device.dashboard_config)
    stage_started_at = mark("field_config_ms", stage_started_at)
    if not panel_fields:
        return []

    tz_offset_minutes = int(tz_offset or 0)
    use_rollup = selected_granularity in {"hour", "day", "week", "month", "year"}
    use_minute_rollup = selected_granularity == "minute"
    use_hour_rollup_fast_path = (
        selected_granularity == "hour"
        and tz_offset_minutes % 60 == 0
    )
    minute_rollup_ts = (
        _normalize_datetime(device_data_crud.get_rollup_min_ts(device_uid))
        if use_minute_rollup
        else None
    )
    hour_rollup_ts = (
        _normalize_datetime(device_data_crud.get_rollup_hour_ts(device_uid))
        if use_rollup
        else None
    )
    stage_started_at = mark("rollup_boundary_ms", stage_started_at)

    aggregated: List[dict]
    if use_minute_rollup and minute_rollup_ts and start and end and start < minute_rollup_ts < end:
        raw_end = minute_rollup_ts - timedelta(microseconds=1)
        raw_part = device_data_crud.get_aggregated_by_uid(
            device_uid,
            start=start,
            end=raw_end,
            granularity=selected_granularity,
            field_types=field_types,
            tz_offset_minutes=tz_offset_minutes,
        )
        rollup_part = device_data_crud.get_rollup_min_by_uid(
            device_uid,
            start=minute_rollup_ts,
            end=end,
            field_types=field_types,
            tz_offset_minutes=tz_offset_minutes,
        )
        aggregated = [*raw_part, *rollup_part]
        aggregated.sort(key=lambda item: item.get("ts"), reverse=True)
    elif use_minute_rollup and minute_rollup_ts and (not start or start >= minute_rollup_ts):
        aggregated = device_data_crud.get_rollup_min_by_uid(
            device_uid,
            start=start,
            end=end,
            field_types=field_types,
            tz_offset_minutes=tz_offset_minutes,
        )
        if not aggregated:
            aggregated = device_data_crud.get_aggregated_by_uid(
                device_uid,
                start=start,
                end=end,
                granularity=selected_granularity,
                field_types=field_types,
                tz_offset_minutes=tz_offset_minutes,
            )
    elif use_rollup and hour_rollup_ts and start and end and start < hour_rollup_ts < end:
        raw_end = hour_rollup_ts - timedelta(microseconds=1)
        raw_part = device_data_crud.get_aggregated_by_uid(
            device_uid,
            start=start,
            end=raw_end,
            granularity=selected_granularity,
            field_types=field_types,
            tz_offset_minutes=tz_offset_minutes,
        )
        if use_hour_rollup_fast_path:
            rollup_part = device_data_crud.get_rollup_hour_by_uid(
                device_uid,
                start=hour_rollup_ts,
                end=end,
                field_types=field_types,
                tz_offset_minutes=tz_offset_minutes,
            )
        else:
            rollup_part = device_data_crud.get_rollup_aggregated_by_uid(
                device_uid,
                start=hour_rollup_ts,
                end=end,
                granularity=selected_granularity,
                field_types=field_types,
                tz_offset_minutes=tz_offset_minutes,
            )
        aggregated = [*raw_part, *rollup_part]
        aggregated.sort(key=lambda item: item.get("ts"), reverse=True)
    elif use_rollup and hour_rollup_ts and (not start or start >= hour_rollup_ts):
        if use_hour_rollup_fast_path:
            aggregated = device_data_crud.get_rollup_hour_by_uid(
                device_uid,
                start=start,
                end=end,
                field_types=field_types,
                tz_offset_minutes=tz_offset_minutes,
            )
        else:
            aggregated = device_data_crud.get_rollup_aggregated_by_uid(
                device_uid,
                start=start,
                end=end,
                granularity=selected_granularity,
                field_types=field_types,
                tz_offset_minutes=tz_offset_minutes,
            )
        if not aggregated:
            aggregated = device_data_crud.get_aggregated_by_uid(
                device_uid,
                start=start,
                end=end,
                granularity=selected_granularity,
                field_types=field_types,
                tz_offset_minutes=tz_offset_minutes,
            )
    else:
        aggregated = device_data_crud.get_aggregated_by_uid(
            device_uid,
            start=start,
            end=end,
            granularity=selected_granularity,
            field_types=field_types,
            tz_offset_minutes=tz_offset_minutes,
        )
    stage_started_at = mark("data_query_ms", stage_started_at)
    if not aggregated:
        timings["total_ms"] = round((time.perf_counter() - started_at) * 1000, 2)
        logger.info(
            "device_data_timing uid=%s granularity=%s buckets=0 timings=%s",
            device_uid,
            selected_granularity,
            timings,
        )
        return []

    state_fields = [
        field
        for field, field_type in field_types.items()
        if field_type in {"text", "boolean"}
    ]
    if start and state_fields:
        seed_source = "raw"
        if selected_granularity == "minute" and minute_rollup_ts and start >= minute_rollup_ts:
            seed_source = "minute"
        elif selected_granularity in {"hour", "day", "week", "month", "year"} and hour_rollup_ts and start >= hour_rollup_ts:
            seed_source = "hour"
        seed_values = device_data_crud.get_seed_values_before(
            device_uid,
            before=start,
            fields=state_fields,
            source=seed_source,
        )
        if seed_values:
            earliest_doc = min(
                aggregated,
                key=lambda item: _normalize_datetime(item.get("ts")) or datetime.max.replace(tzinfo=timezone.utc),
            )
            earliest_data = earliest_doc.get("data") if isinstance(earliest_doc.get("data"), dict) else {}
            first_bucket_seed = {
                field: value
                for field, value in seed_values.items()
                if field not in earliest_data or earliest_data.get(field) is None
            }
            if first_bucket_seed:
                earliest_doc["seed"] = first_bucket_seed
    stage_started_at = mark("seed_query_ms", stage_started_at)

    response = [serialize_document(doc) for doc in aggregated]
    timings["serialize_ms"] = round((time.perf_counter() - stage_started_at) * 1000, 2)
    timings["total_ms"] = round((time.perf_counter() - started_at) * 1000, 2)
    logger.info(
        "device_data_timing uid=%s granularity=%s buckets=%s timings=%s",
        device_uid,
        selected_granularity,
        len(response),
        timings,
    )
    return response
