from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.crud.postgres import device as device_crud
from app.crud.postgres import department as department_crud
from app.crud.mongodb import devices_data as device_data_crud
from app.models.user import User as UserModel
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceOut
from app.models.enum.user_role import UserRole
from app.utils.mongodb import serialize_document

router = APIRouter(prefix="/devices", tags=["devices"])


# ==================== Create ====================
@router.post("/", response_model=DeviceOut, status_code=status.HTTP_201_CREATED)
def create_device(
    device: DeviceCreate,
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
    
    return device_crud.create_device(db, device)


# ==================== Read (List) ====================
@router.get("/", response_model=List[DeviceOut])
def get_devices(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all devices with pagination."""
    require_role(current_user, [UserRole.superuser])

    return device_crud.get_devices(db, skip=skip, limit=limit)


# ==================== Read (Single) ====================
@router.get("/{device_id}", response_model=DeviceOut)
def get_device(
    device_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get device by ID."""
    require_role(current_user, [UserRole.superuser])

    device = device_crud.get_device(db, device_id)
    if not device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    return device

# ==================== Update ====================
@router.patch("/{device_id}", response_model=DeviceOut)
def update_device(
    device_id: int,
    device_update: DeviceUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update device"""
    require_role(current_user, [UserRole.superuser])
    
    # Check if device exists
    existing_device = device_crud.get_device(db, device_id)
    if not existing_device:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device not found"
        )
    
    # If department_id is being updated, check if the new department exists
    if device_update.department_id:
        department = department_crud.get_department(db, device_update.department_id)
        if not department:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Department not found"
            )

    updated_device = device_crud.update_device(db, device_id, device_update)
    return updated_device

# ==================== Delete ====================
@router.delete("/{device_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_device(
    device_id: int,
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
    
    device_crud.delete_device(db, device_id)
    return None

# ==================== Fetch Device Data =====================
@router.get("/data/{device_uid}")
def fetch_device_data(
    device_uid: str,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Fetch data for a specific device by UID."""
    require_role(current_user, [UserRole.superuser, UserRole.user])
    
    # device = device_crud.get_device_by_uid(db, device_uid)
    # if not device:
    #     raise HTTPException(
    #         status_code=status.HTTP_404_NOT_FOUND,
    #         detail="Device not found"
    #     )
    if current_user == UserRole.user:
        if device.department_id != current_user.department_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this device's data"
            )
    data = device_data_crud.get_by_uid(device_uid)
    if not data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No data found for this device"
        )
    data = [serialize_document(doc) for doc in data]
    return data


