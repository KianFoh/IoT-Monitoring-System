from typing import Optional
from sqlalchemy.orm import Session
from app.models.mqtt_user import Mqtt_User as MqttUserModel
from app.schemas.mqtt_user import MqttUserCreate, MqttUserUpdate
from app.core.security import encrypt_password

# ==================== Create ====================
def create_mqtt_user(db: Session, mqtt_user: MqttUserCreate):
    """Create new MQTT user"""
    encrypted_password = encrypt_password(mqtt_user.password)
    db_mqtt_user = MqttUserModel(
        username=mqtt_user.username,
        password=encrypted_password,
        customer_id=mqtt_user.customer_id
    )
    db.add(db_mqtt_user)
    db.commit()
    db.refresh(db_mqtt_user)

    return db_mqtt_user

# ==================== Read ====================
def get_mqtt_user(db: Session, mqtt_user_id: int):
    """Get MQTT user by ID"""
    user = db.query(MqttUserModel).filter(MqttUserModel.id == mqtt_user_id).first()
    return user

def get_mqtt_user_by_username(db: Session, username: str):
    """Get MQTT user by username"""
    return db.query(MqttUserModel).filter(MqttUserModel.username == username).first()

def get_mqtt_users(db: Session, skip: int = 0, limit: int = 10):
    """Get all MQTT users with pagination"""
    return db.query(MqttUserModel).offset(skip).limit(limit).all()

# ==================== Update ====================
def update_mqtt_user(db: Session, db_mqtt_user: MqttUserModel, mqtt_user_update: MqttUserUpdate):
    """Update MQTT user"""
    
    update_data = mqtt_user_update.model_dump(exclude_unset=True)
    
    if "password" in update_data:
        db_mqtt_user.password = encrypt_password(update_data.pop("password"))

    for field, value in update_data.items():
        setattr(db_mqtt_user, field, value)

    db.commit()
    db.refresh(db_mqtt_user)
    return db_mqtt_user

# ==================== Delete ====================
def delete_mqtt_user(db: Session, mqtt_user_id: int):
    """Delete MQTT user"""
    db_mqtt_user = get_mqtt_user(db, mqtt_user_id)
    if db_mqtt_user:
        db.delete(db_mqtt_user)
        db.commit()
        return True
    return False

# ==================== Validation ====================
def check_mqtt_user_username_unique(db: Session, username: str, exclude_mqtt_user_id: Optional[int] = None):
    """
    Check if a MQTT user username already exists for a specific customer.
    Raises HTTPException if it exists.
    """
    query = db.query(MqttUserModel).filter(MqttUserModel.username == username)

    if exclude_mqtt_user_id:
        query = query.filter(MqttUserModel.id != exclude_mqtt_user_id)

    existing_mqtt_user = query.first()
    return existing_mqtt_user is None

# ==================== Count ====================
def count_mqtt_users(db: Session):
    """Count total number of MQTT users."""
    return db.query(MqttUserModel).count()