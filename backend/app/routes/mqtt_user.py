from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decrypt_password, get_current_user, require_role
from app.crud.postgres import mqtt_user as mqtt_user_crud
from app.crud.postgres import customer as customer_crud
from app.models.user import User as UserModel
from app.schemas.mqtt_user import MqttUserCreate, MqttUserUpdate, MqttUserOut, MqttUserListResponse
from app.models.enum.user_role import UserRole
from app.utils.ws_events import broadcast_mqtt_user_event

router = APIRouter(prefix="/mqtt_users", tags=["mqtt_users"])

# ==================== Count ====================
@router.get("/count", response_model=int)
def count_mqtt_users(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Count total number of MQTT users."""
    require_role(current_user, [UserRole.superuser])
    
    return mqtt_user_crud.count_mqtt_users(db)

# ==================== Create ====================
@router.post("/", response_model=MqttUserOut, status_code=status.HTTP_201_CREATED)
async def create_mqtt_user(
    mqtt_user: MqttUserCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new MQTT user"""
    require_role(current_user, [UserRole.superuser])
    
    # Check if MQTT user already exists
    exist = mqtt_user_crud.get_mqtt_user_by_username(db, mqtt_user.username)
    if exist:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="MQTT user with this username already exists"
        )
    customer = customer_crud.get_customer(db, mqtt_user.customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
        
    db_mqtt_user = mqtt_user_crud.create_mqtt_user(db, mqtt_user)
    row = mqtt_user_crud.get_mqtt_user_with_customer(db, db_mqtt_user.id)
    mqtt_user_out = mqtt_user_crud.serialize_mqtt_user_row(row) if row else MqttUserOut.model_validate(
        {
            "id": db_mqtt_user.id,
            "username": db_mqtt_user.username,
            "password": None,
            "customer_id": db_mqtt_user.customer_id,
            "customer_name": None,
            "is_active": db_mqtt_user.is_active,
            "created_at": db_mqtt_user.created_at,
        }
    )
    await broadcast_mqtt_user_event("add", mqtt_user_out)
    return mqtt_user_out


# ==================== Read (List) ====================
@router.get("/", response_model=MqttUserListResponse)
def list_mqtt_users(
    search: str | None = Query(None, description="Search by username or customer name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all MQTT users with pagination."""
    require_role(current_user, [UserRole.superuser])

    items, total = mqtt_user_crud.get_mqtt_users(
        db,
        search=search.strip() if search else None,
        page=page,
        page_size=page_size,
    )
    return MqttUserListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


# ==================== Read (Single) ====================
@router.get("/{mqtt_user_id}", response_model=MqttUserOut)
def get_mqtt_user(
    mqtt_user_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get MQTT user by ID."""
    require_role(current_user, [UserRole.superuser])

    row = mqtt_user_crud.get_mqtt_user_with_customer(db, mqtt_user_id)
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MQTT user not found"
        )
    mqtt_user, customer_name = row
    return MqttUserOut(
        id=mqtt_user.id,
        username=mqtt_user.username,
        password=decrypt_password(mqtt_user.password),
        customer_id=mqtt_user.customer_id,
        customer_name=customer_name,
        is_active=mqtt_user.is_active,
        created_at=mqtt_user.created_at,
    )


# ==================== Update ====================
@router.patch("/{mqtt_user_id}", response_model=MqttUserOut)
async def update_mqtt_user(
    mqtt_user_id: int,
    mqtt_user_update: MqttUserUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update MQTT user"""
    require_role(current_user, [UserRole.superuser])
    
    # Check if MQTT user exists
    existing_mqtt_user = mqtt_user_crud.get_mqtt_user(db, mqtt_user_id)
    if not existing_mqtt_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MQTT user not found"
        )
    # Check if new name already exists
    if mqtt_user_update.username:
        unique_mqtt_user = mqtt_user_crud.check_mqtt_user_username_unique(db, mqtt_user_update.username, existing_mqtt_user.id)
        if not unique_mqtt_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="MQTT user with this name already exists"
            )
    updated_mqtt_user = mqtt_user_crud.update_mqtt_user(db, existing_mqtt_user, mqtt_user_update)
    row = mqtt_user_crud.get_mqtt_user_with_customer(db, mqtt_user_id)
    mqtt_user_out = mqtt_user_crud.serialize_mqtt_user_row(row) if row else MqttUserOut.model_validate(
        {
            "id": updated_mqtt_user.id,
            "username": updated_mqtt_user.username,
            "password": None,
            "customer_id": updated_mqtt_user.customer_id,
            "customer_name": None,
            "is_active": updated_mqtt_user.is_active,
            "created_at": updated_mqtt_user.created_at,
        }
    )
    await broadcast_mqtt_user_event("update", mqtt_user_out)
    return mqtt_user_out


# ==================== Delete ====================
@router.delete("/{mqtt_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_mqtt_user(
    mqtt_user_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete MQTT user"""
    require_role(current_user, [UserRole.superuser])
    
    # Check if MQTT user exists
    mqtt_user = mqtt_user_crud.get_mqtt_user(db, mqtt_user_id)
    if not mqtt_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MQTT user not found"
        )
    
    mqtt_user_crud.delete_mqtt_user(db, mqtt_user_id)
    await broadcast_mqtt_user_event("delete", {"id": mqtt_user_id})
