from typing import Optional
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.models.user import User as UserModel
from app.models.department import Department as DepartmentModel
from app.models.customer import Customer as CustomerModel
from app.schemas.user import UserCreate, UserUpdate
from app.core.security import get_password_hash
from passlib.context import CryptContext
from app.utils.time import utc_now

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

def _base_user_query(db: Session):
    """Base query joining department and customer for enrichment."""
    return (
        db.query(
            UserModel,
            DepartmentModel.name.label("department_name"),
            CustomerModel.name.label("customer_name"),
        )
        .outerjoin(DepartmentModel, UserModel.department_id == DepartmentModel.id)
        .outerjoin(CustomerModel, DepartmentModel.customer_id == CustomerModel.id)
    )


def get_users(
    db: Session,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
    department_id: Optional[int] = None,
    role: Optional[str] = None
):
    """Get all users with optional filters and pagination."""
    query = _base_user_query(db)

    if department_id:
        query = query.filter(UserModel.department_id == department_id)
    if role:
        query = query.filter(UserModel.role == role)
    if search:
        like = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(UserModel.email).like(like),
                func.lower(DepartmentModel.name).like(like),
                func.lower(CustomerModel.name).like(like),
            )
        )

    total = query.count()
    rows = (
        query.order_by(UserModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = []
    for user, department_name, customer_name in rows:
        items.append(
            {
                "id": user.id,
                "email": user.email,
                "department_id": user.department_id,
                "department_name": department_name,
                "customer_name": customer_name,
                "role": user.role,
                "is_verified": user.is_verified,
                "is_active": user.is_active,
                "last_login": user.last_login,
                "created_at": user.created_at,
            }
        )
    return items, total

def get_user_with_relations(db: Session, user_id: int):
    """Get a single user enriched with department and customer names."""
    row = _base_user_query(db).filter(UserModel.id == user_id).first()
    if not row:
        return None
    user, department_name, customer_name = row
    return {
        "id": user.id,
        "email": user.email,
        "department_id": user.department_id,
        "department_name": department_name,
        "customer_name": customer_name,
        "role": user.role,
        "is_verified": user.is_verified,
        "is_active": user.is_active,
        "last_login": user.last_login,
        "created_at": user.created_at,
    }


# ==================== Update ====================
def update_user(db: Session, db_user: UserModel, user_update: UserUpdate):
    """Update user"""
    
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
        db_user.last_login = utc_now()
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

# ==================== Count ====================
def count_users(db: Session):
    """Count total number of users."""
    return db.query(UserModel).count()
