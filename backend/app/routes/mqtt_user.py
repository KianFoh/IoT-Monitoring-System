from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import decrypt_password, get_current_user, require_role
from app.crud.postgres import mqtt_user as mqtt_user_crud
from app.crud.postgres import customer as customer_crud
from app.models.user import User as UserModel
from app.schemas.mqtt_user import MqttUserCreate, MqttUserUpdate, MqttUserOut
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
    await broadcast_mqtt_user_event("add", MqttUserOut.model_validate(db_mqtt_user, from_attributes=True))
    return db_mqtt_user


# ==================== Read (List) ====================
@router.get("/", response_model=List[MqttUserOut])
def get_mqtt_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all MQTT users with pagination."""
    require_role(current_user, [UserRole.superuser])

    return mqtt_user_crud.get_mqtt_users(db, skip=skip, limit=limit)


# ==================== Read (Single) ====================
@router.get("/{mqtt_user_id}", response_model=MqttUserOut)
def get_mqtt_user(
    mqtt_user_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get MQTT user by ID."""
    require_role(current_user, [UserRole.superuser])

    mqtt_user = mqtt_user_crud.get_mqtt_user(db, mqtt_user_id)
    if not mqtt_user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="MQTT user not found"
        )
    mqtt_user = MqttUserOut(
            id= mqtt_user.id,
            username= mqtt_user.username,
            password= decrypt_password(mqtt_user.password),
            customer_id= mqtt_user.customer_id,
            is_active= mqtt_user.is_active,
            created_at= mqtt_user.created_at
        )
    return mqtt_user


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
    if mqtt_user_update.customer_id:
        customer = customer_crud.get_customer(db, mqtt_user_update.customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
    
    updated_mqtt_user = mqtt_user_crud.update_mqtt_user(db, existing_mqtt_user, mqtt_user_update)
    await broadcast_mqtt_user_event("update", MqttUserOut.model_validate(updated_mqtt_user, from_attributes=True))
    return updated_mqtt_user


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