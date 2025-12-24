from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from passlib.context import CryptContext
from datetime import datetime, UTC

# ==================== Password Hashing Context ====================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ==================== Create ====================
def create_user(db: Session, user: UserCreate):
    """Create new user"""
    db_user = UserModel(
        email=user.email,
        department_id=user.department_id,
        role=user.role,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


# ==================== Read ====================
def get_user(db: Session, user_id: int):
    """Get user by ID"""
    return db.query(UserModel).filter(UserModel.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    """Get user by email"""
    return db.query(UserModel).filter(UserModel.email == email).first()


def get_users(db: Session, skip: int = 0, limit: int = 10, department_id: int = None, role: str = None):
    """Get all users with optional filters"""
    query = db.query(UserModel)
    
    if department_id:
        query = query.filter(UserModel.department_id == department_id)
    if role:
        query = query.filter(UserModel.role == role)
    
    return query.offset(skip).limit(limit).all()


# ==================== Update ====================
def update_user(db: Session, user_id: int, user_update: UserUpdate):
    """Update user"""
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    update_data = user_update.model_dump(exclude_unset=True)
    
    # Hash password if it's being updated
    if "password" in update_data:
        update_data["password"] = get_password_hash(update_data["password"])
    
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user


def update_last_login(db: Session, user_id: int):
    """Update user's last login timestamp"""
    db_user = get_user(db, user_id)
    if db_user:
        db_user.last_login = datetime.now(UTC)
        db.commit()
        db.refresh(db_user)
    return db_user


# ==================== Delete ====================
def delete_user(db: Session, user_id: int):
    """Delete user (hard delete)"""
    db_user = get_user(db, user_id)
    if db_user:
        db.delete(db_user)
        db.commit()
        return True
    return False


# ==================== Manage Active Status ====================
def activate_user(db: Session, user_id: int):
    """Activate user account"""
    db_user = get_user(db, user_id)
    if db_user:
        db_user.is_active = True
        db.commit()
        db.refresh(db_user)
    return db_user


def deactivate_user(db: Session, user_id: int):
    """Deactivate user account (soft delete)"""
    db_user = get_user(db, user_id)
    if db_user:
        db_user.is_active = False
        db.commit()
        db.refresh(db_user)
    return db_user