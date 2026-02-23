from typing import Optional
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.models.mqtt_user import MqttUser as MqttUserModel
from app.models.customer import Customer as CustomerModel
from app.schemas.mqtt_user import MqttUserCreate, MqttUserUpdate, MqttUserOut
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

def _base_mqtt_user_query(db: Session):
    """Base query joining customers for enrichment."""
    return (
        db.query(
            MqttUserModel,
            CustomerModel.name.label("customer_name"),
        )
        .join(CustomerModel, MqttUserModel.customer_id == CustomerModel.id)
    )

def serialize_mqtt_user_row(row, password: Optional[str] = None) -> MqttUserOut:
    mqtt_user, customer_name = row
    return MqttUserOut.model_validate(
        {
            "id": mqtt_user.id,
            "username": mqtt_user.username,
            "password": password,
            "customer_id": mqtt_user.customer_id,
            "customer_name": customer_name,
            "is_active": mqtt_user.is_active,
            "created_at": mqtt_user.created_at,
        }
    )

def get_mqtt_users(db: Session, search: Optional[str] = None, page: int = 1, page_size: int = 10):
    """Get all MQTT users with pagination and optional search."""
    query = _base_mqtt_user_query(db)
    if search:
        like = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(MqttUserModel.username).like(like),
                func.lower(CustomerModel.name).like(like),
            )
        )
    total = query.count()
    rows = (
        query.order_by(MqttUserModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [serialize_mqtt_user_row(row) for row in rows]
    return items, total

def get_mqtt_user_with_customer(db: Session, mqtt_user_id: int):
    """Get a single MQTT user enriched with customer name."""
    row = _base_mqtt_user_query(db).filter(MqttUserModel.id == mqtt_user_id).first()
    if not row:
        return None
    return row

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
