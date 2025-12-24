from sqlalchemy.orm import Session
from app.models.device import Device as DeviceModel
from app.schemas.device import DeviceCreate, DeviceUpdate

# ==================== Create ====================
def create_device(db: Session, device: DeviceCreate):
    """Create new device"""
    db_device = DeviceModel(
        uid=device.uid,
        name=device.name,
        department_id=device.department_id
    )
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

# ==================== Read ====================
def get_device(db: Session, device_id: int):
    """Get device by ID"""
    return db.query(DeviceModel).filter(DeviceModel.id == device_id).first()

def get_device_by_name(db: Session, name: str):
    """Get device by name"""
    return db.query(DeviceModel).filter(DeviceModel.name == name).first()

def get_device_by_uid(db: Session, uid: str):
    """Get device by UID"""
    return db.query(DeviceModel).filter(DeviceModel.uid == uid).first()

def get_devices(db: Session, skip: int = 0, limit: int = 10):
    """Get all devices with pagination"""
    return db.query(DeviceModel).offset(skip).limit(limit).all()

# ==================== Update ====================
def update_device(db: Session, device_id: int, device_update: DeviceUpdate):
    """Update device"""
    db_device = get_device(db, device_id)
    if not db_device:
        return None
    
    update_data = device_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_device, field, value)
    
    db.commit()
    db.refresh(db_device)
    return db_device
# ==================== Delete ====================
def delete_device(db: Session, device_id: int):
    """Delete device"""
    db_device = get_device(db, device_id)
    if db_device:
        db.delete(db_device)
        db.commit()
        return True
    return False