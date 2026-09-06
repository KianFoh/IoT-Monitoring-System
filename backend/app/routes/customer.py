from fastapi import APIRouter, Depends, HTTPException, Request, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.utils.ws_events import broadcast_customer_event
from app.crud.postgres import customer as customer_crud
from app.crud.postgres import device as device_crud
from app.crud.postgres import distributor as distributor_crud
from app.utils.device_events import publish_device_event
from app.models.user import User as UserModel
from app.models.enum.user_role import UserRole
from app.schemas.customer import CustomerCreate, CustomerSearch, CustomerUpdate, CustomerOut, CustomerListResponse

router = APIRouter(prefix="/customers", tags=["customers"])

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
def count_customers(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Count total number of customers."""
    require_role(current_user, [UserRole.superuser])
    
    total_customers = customer_crud.count_customers(db)
    return total_customers

# ==================== Create ====================
@router.post("/", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
async def create_customer(
    customer: CustomerCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new customer"""
    require_role(current_user, [UserRole.superuser])
    
    existing_customer = customer_crud.get_customer_by_name(db, customer.name)
    if existing_customer:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer name already exists"
        )
    customer.mqtt_topic = _normalize_mqtt_topic(customer.mqtt_topic, customer.name)
    existing_topic = customer_crud.get_customer_by_mqtt_topic(db, customer.mqtt_topic)
    if existing_topic:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer MQTT topic already exists",
        )

    if customer.distributor_id is not None:
        distributor = distributor_crud.get_distributor(db, customer.distributor_id)
        if not distributor:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Distributor not found",
            )
    
    db_customer = customer_crud.create_customer(db, customer)
    customer_out = customer_crud.get_customer_with_references(db, db_customer.id) or CustomerOut.model_validate(
        {
            "id": db_customer.id,
            "name": db_customer.name,
            "mqtt_topic": db_customer.mqtt_topic,
            "phone_no": db_customer.phone_no,
            "distributor_id": db_customer.distributor_id,
            "distributor_name": None,
            "is_active": db_customer.is_active,
            "created_at": db_customer.created_at,
            "is_deletable": True,
        }
    )
    await broadcast_customer_event("add", customer_out)
    return customer_out


# ==================== Read (List) ====================
@router.get("/", response_model=CustomerListResponse)
def list_customers(
    search: str | None = Query(None, description="Search by name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    distributor_ids: str | None = Query(None, description="Comma-separated distributor IDs"),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all customers with pagination and optional distributor filters."""
    require_role(current_user, [UserRole.superuser])

    items, total = customer_crud.get_customers(
        db,
        search=search.strip() if search else None,
        page=page,
        page_size=page_size,
        distributor_ids=_parse_id_list(distributor_ids),
    )
    return CustomerListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )

# ==================== Search (Autocomplete) ====================
@router.get("/search", response_model=list[CustomerSearch])
def search_customers(
    name: str = Query(..., min_length=1, description="Partial customer name"),
    limit: int = Query(10, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search customers by name (for autocomplete)."""
    require_role(current_user, [UserRole.superuser])
    return customer_crud.search_customers_by_name(db, name, limit=limit)


# ==================== Read (Single) ====================
@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get customer by ID."""
    require_role(current_user, [UserRole.superuser])

    customer = customer_crud.get_customer_with_references(db, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    return customer


# ==================== Update ====================
@router.patch("/{customer_id}", response_model=CustomerOut)
async def update_customer(
    customer_id: int,
    customer_update: CustomerUpdate,
    request: Request,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update customer"""
    require_role(current_user, [UserRole.superuser])
    
    db_customer = customer_crud.get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    previous_mqtt_topic = db_customer.mqtt_topic
    previous_distributor_id = db_customer.distributor_id
    previous_distributor_mqtt_topic = None
    if previous_distributor_id is not None:
        previous_distributor = distributor_crud.get_distributor(db, previous_distributor_id)
        previous_distributor_mqtt_topic = (
            previous_distributor.mqtt_topic or previous_distributor.name
            if previous_distributor
            else None
        )
    
    # Check if new name already exists (excluding current customer)
    if customer_update.name:
        existing_customer = customer_crud.get_customer_by_name_excluding_id(
            db, customer_update.name, customer_id
        )
        if existing_customer:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Customer name already exists"
            )
    if "mqtt_topic" in customer_update.model_fields_set:
        customer_update.mqtt_topic = _normalize_mqtt_topic(customer_update.mqtt_topic, db_customer.name)
        existing_topic = customer_crud.get_customer_by_mqtt_topic_excluding_id(
            db, customer_update.mqtt_topic, customer_id
        )
        if existing_topic:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Customer MQTT topic already exists",
            )

    if "distributor_id" in customer_update.model_fields_set:
        if customer_update.distributor_id is not None:
            distributor = distributor_crud.get_distributor(db, customer_update.distributor_id)
            if not distributor:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Distributor not found",
                )

    should_restart_customer_devices = False
    if "mqtt_topic" in customer_update.model_fields_set:
        should_restart_customer_devices = customer_update.mqtt_topic != previous_mqtt_topic
    if "distributor_id" in customer_update.model_fields_set:
        should_restart_customer_devices = (
            should_restart_customer_devices
            or customer_update.distributor_id != previous_distributor_id
        )
    
    db_customer = customer_crud.update_customer(db, customer_id, customer_update)
    customer_out = customer_crud.get_customer_with_references(db, customer_id) or CustomerOut.model_validate(
        {
            "id": db_customer.id,
            "name": db_customer.name,
            "mqtt_topic": db_customer.mqtt_topic,
            "phone_no": db_customer.phone_no,
            "distributor_id": db_customer.distributor_id,
            "distributor_name": None,
            "is_active": db_customer.is_active,
            "created_at": db_customer.created_at,
            "is_deletable": True,
        }
    )
    await broadcast_customer_event("update", customer_out)
    if should_restart_customer_devices:
        for device_out in device_crud.get_devices_by_customer_id(db, customer_id):
            publish_device_event(
                request,
                previous_mqtt_topic,
                device_out.department_name,
                {
                    "uid": device_out.uid,
                    "event_type": "update",
                    "customer_name": device_out.customer_name,
                    "customer_mqtt_topic": device_out.customer_mqtt_topic,
                    "distributor_name": device_out.distributor_name,
                    "distributor_mqtt_topic": device_out.distributor_mqtt_topic,
                    "department_name": device_out.department_name,
                    "data_interval": device_out.data_interval,
                    "is_active": device_out.is_active,
                    "restart_pipeline": True,
                },
                previous_distributor_mqtt_topic,
            )
    return customer_out


# ==================== Delete ====================
@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete customer."""
    require_role(current_user, [UserRole.superuser])
    
    db_customer = customer_crud.get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    if customer_crud.customer_has_references(db, customer_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer is referenced by other records",
        )

    success = customer_crud.delete_customer(db, customer_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    await broadcast_customer_event("delete", {"id": customer_id})
