from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.crud.postgres import department as department_crud
from app.crud.postgres import customer as customer_crud
from app.crud.postgres import device as device_crud
from app.models.user import User as UserModel
from app.schemas.department import DepartmentCreate, DepartmentSearch, DepartmentUpdate, DepartmentOut, DepartmentListResponse
from app.models.enum.user_role import UserRole
from app.utils.device_events import publish_device_event
from app.utils.ws_events import broadcast_department_event

router = APIRouter(prefix="/departments", tags=["departments"])

def _parse_id_list(value: str | None) -> list[int]:
    if not value:
        return []
    ids: list[int] = []
    for raw_item in value.split(","):
        item = raw_item.strip()
        if not item:
            continue
        try:
            ids.append(int(item))
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Filter IDs must be comma-separated integers",
            )
    return list(dict.fromkeys(ids))

def _normalize_mqtt_topic(value: str | None, fallback: str | None = None) -> str:
    topic = (value if value is not None else fallback or "").strip()
    if not topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MQTT topic is required",
        )
    if "/" in topic or "#" in topic or "+" in topic:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="MQTT topic must be a single topic segment without '/', '#', or '+'",
        )
    return topic

# ==================== Count ====================
@router.get("/count", response_model=int)
def count_departments(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Count total number of departments."""
    require_role(current_user, [UserRole.superuser])
    return department_crud.count_departments(db)

# ==================== Create ====================
@router.post("/", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
async def create_department(
    department: DepartmentCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new department"""
    require_role(current_user, [UserRole.superuser])
    department.mqtt_topic = _normalize_mqtt_topic(department.mqtt_topic, department.name)
    
    # Check if department already exists
    unique_department = department_crud.check_department_name_unique(db, department.customer_id, department.name)
    if not unique_department:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department with this name already exists"
        )
    existing_topic = department_crud.get_department_by_mqtt_topic(db, department.customer_id, department.mqtt_topic)
    if existing_topic:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department MQTT topic already exists for the customer",
        )
    
    customer = customer_crud.get_customer(db, department.customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    db_department = department_crud.create_department(db, department)
    department_out = department_crud.get_department_with_customer(db, db_department.id) or DepartmentOut.model_validate(
        {
            "id": db_department.id,
            "name": db_department.name,
            "mqtt_topic": db_department.mqtt_topic,
            "customer_id": db_department.customer_id,
            "customer_name": None,
            "is_active": db_department.is_active,
            "created_at": db_department.created_at,
            "is_deletable": True,
        }
    )
    await broadcast_department_event("add", department_out)
    return department_out


# ==================== Read (List) ====================
@router.get("/", response_model=DepartmentListResponse)
def list_departments(
    search: str | None = Query(None, description="Search by department or customer name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    distributor_ids: str | None = Query(None, description="Comma-separated distributor IDs"),
    customer_ids: str | None = Query(None, description="Comma-separated customer IDs"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all departments with pagination and optional hierarchy filters."""
    require_role(current_user, [UserRole.superuser])

    items, total = department_crud.get_departments(
        db,
        search=search.strip() if search else None,
        page=page,
        page_size=page_size,
        distributor_ids=_parse_id_list(distributor_ids),
        customer_ids=_parse_id_list(customer_ids),
    )
    return DepartmentListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )

# ==================== Search (Autocomplete) ====================
@router.get("/search", response_model=List[DepartmentSearch])
def search_departments(
    name: str = Query("", min_length=0, description="Partial department name"),
    customer_id: int | None = Query(None, description="Filter by customer id"),
    limit: int = Query(10, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search departments by name (for autocomplete)."""
    require_role(current_user, [UserRole.superuser])
    if not name or not name.strip():
        return []
    return department_crud.search_departments_by_name(db, name.strip(), limit=limit, customer_id=customer_id)

# ==================== Read (Single) ====================
@router.get("/{department_id}", response_model=DepartmentOut)
def get_department(
    department_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get department by ID."""
    require_role(current_user, [UserRole.superuser])

    department = department_crud.get_department_with_customer(db, department_id)
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    return department


# ==================== Update ====================
@router.patch("/{department_id}", response_model=DepartmentOut)
async def update_department(
    department_id: int,
    department_update: DepartmentUpdate,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update department"""
    require_role(current_user, [UserRole.superuser])
    
    # Check if department exists
    existing_department = department_crud.get_department(db, department_id)
    if not existing_department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    previous_mqtt_topic = existing_department.mqtt_topic
    if department_update.name is not None:
        unique_department = department_crud.check_department_name_unique(
            db,
            existing_department.customer_id,
            department_update.name,
            existing_department.id,
        )
        if not unique_department:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Department with this name already exists for the customer"
            )
    if "mqtt_topic" in department_update.model_fields_set:
        department_update.mqtt_topic = _normalize_mqtt_topic(department_update.mqtt_topic, existing_department.name)
        existing_topic = department_crud.get_department_by_mqtt_topic_excluding_id(
            db,
            existing_department.customer_id,
            department_update.mqtt_topic,
            existing_department.id,
        )
        if existing_topic:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Department MQTT topic already exists for the customer",
            )

    should_restart_devices = (
        "mqtt_topic" in department_update.model_fields_set
        and department_update.mqtt_topic != previous_mqtt_topic
    )
    
    updated_department = department_crud.update_department(db, department_id, department_update)
    department_out = department_crud.get_department_with_customer(db, department_id) or DepartmentOut.model_validate(
        {
            "id": updated_department.id,
            "name": updated_department.name,
            "mqtt_topic": updated_department.mqtt_topic,
            "customer_id": updated_department.customer_id,
            "customer_name": None,
            "is_active": updated_department.is_active,
            "created_at": updated_department.created_at,
            "is_deletable": True,
        }
    )
    await broadcast_department_event("update", department_out)
    if should_restart_devices:
        for device_out in device_crud.get_devices_by_department_id(db, department_id):
            publish_device_event(
                request,
                device_out.customer_mqtt_topic,
                previous_mqtt_topic,
                {
                    "uid": device_out.uid,
                    "event_type": "update",
                    "customer_name": device_out.customer_name,
                    "customer_mqtt_topic": device_out.customer_mqtt_topic,
                    "distributor_name": device_out.distributor_name,
                    "distributor_mqtt_topic": device_out.distributor_mqtt_topic,
                    "department_name": device_out.department_name,
                    "department_mqtt_topic": device_out.department_mqtt_topic,
                    "data_interval": device_out.data_interval,
                    "is_active": device_out.is_active,
                    "restart_pipeline": True,
                },
                device_out.distributor_mqtt_topic or device_out.distributor_name,
            )
    return department_out


# ==================== Delete ====================
@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete department"""
    require_role(current_user, [UserRole.superuser])
    
    # Check if department exists
    department = department_crud.get_department(db, department_id)
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )

    if department_crud.department_has_references(db, department_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department is referenced by other records",
        )
    
    department_crud.delete_department(db, department_id)
    await broadcast_department_event("delete", {"id": department_id})
