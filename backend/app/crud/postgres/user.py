from typing import Optional
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, selectinload
from app.models.user import User as UserModel
from app.models.department import Department as DepartmentModel
from app.models.customer import Customer as CustomerModel
from app.models.user_department import user_department_table
from app.schemas.user import UserCreate, UserProfilePictureUpdate, UserUpdate
from pydantic import BaseModel
from app.core.security import get_password_hash
from passlib.context import CryptContext
from app.utils.time import utc_now

# ==================== Password Hashing Context ====================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _normalize_department_ids(department_ids: Optional[list[int]], department_id: Optional[int] = None) -> list[int]:
    ids = list(department_ids or [])
    if department_id is not None and department_id not in ids:
        ids.insert(0, department_id)
    return list(dict.fromkeys(ids))


def _sync_user_departments(db: Session, db_user: UserModel, department_ids: list[int]) -> None:
    db_user.departments = (
        db.query(DepartmentModel)
        .filter(DepartmentModel.id.in_(department_ids))
        .all()
        if department_ids
        else []
    )
    db_user.department_id = department_ids[0] if department_ids else None


def _department_payload(user: UserModel) -> dict:
    departments = list(user.departments or [])
    if not departments and user.department:
        departments = [user.department]
    department_ids = [department.id for department in departments]
    department_names = [department.name for department in departments]
    customer_names = [
        department.customer.name
        for department in departments
        if getattr(department, "customer", None) is not None
    ]
    return {
        "department_id": department_ids[0] if department_ids else user.department_id,
        "department_name": department_names[0] if department_names else None,
        "department_ids": department_ids,
        "department_names": department_names,
        "customer_name": customer_names[0] if customer_names else None,
        "customer_names": list(dict.fromkeys(customer_names)),
    }


def _serialize_user(user: UserModel) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "username": user.username,
        "profile_picture": user.profile_picture,
        **_department_payload(user),
        "role": user.role,
        "is_verified": user.is_verified,
        "is_active": user.is_active,
        "last_login": user.last_login,
        "created_at": user.created_at,
    }

# ==================== Create ====================
def create_user(db: Session, user: UserCreate):
    """Create new user"""
    department_ids = _normalize_department_ids(user.department_ids, user.department_id)
    db_user = UserModel(
        email=user.email,
        department_id=department_ids[0] if department_ids else None,
        role=user.role,
        username=user.username,
        profile_picture=user.profile_picture,
    )
    db.add(db_user)
    _sync_user_departments(db, db_user, department_ids)
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
    """Base user query with departments eager-loaded for serialization."""
    return db.query(UserModel).options(
        selectinload(UserModel.department).selectinload(DepartmentModel.customer),
        selectinload(UserModel.departments).selectinload(DepartmentModel.customer),
    )


def _join_departments_for_filter(query):
    return (
        query
        .outerjoin(user_department_table, UserModel.id == user_department_table.c.user_id)
        .outerjoin(DepartmentModel, user_department_table.c.department_id == DepartmentModel.id)
        .outerjoin(CustomerModel, DepartmentModel.customer_id == CustomerModel.id)
    )


def get_user_department_ids(db: Session, user_id: int) -> list[int]:
    rows = (
        db.query(user_department_table.c.department_id)
        .filter(user_department_table.c.user_id == user_id)
        .all()
    )
    ids = [row[0] for row in rows]
    if ids:
        return ids
    user = get_user(db, user_id)
    return [user.department_id] if user and user.department_id else []


def user_has_department(db: Session, user_id: int, department_id: Optional[int]) -> bool:
    if department_id is None:
        return False
    exists = (
        db.query(user_department_table.c.user_id)
        .filter(
            user_department_table.c.user_id == user_id,
            user_department_table.c.department_id == department_id,
        )
        .first()
    )
    if exists:
        return True
    user = get_user(db, user_id)
    return bool(user and user.department_id == department_id)


def get_users(
    db: Session,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
    department_id: Optional[int] = None,
    distributor_ids: Optional[list[int]] = None,
    customer_ids: Optional[list[int]] = None,
    department_ids: Optional[list[int]] = None,
    role: Optional[str] = None
):
    """Get all users with optional filters and pagination."""
    query = _base_user_query(db)
    distributor_ids = distributor_ids or []
    customer_ids = customer_ids or []
    department_ids = _normalize_department_ids(department_ids, department_id)

    if distributor_ids or customer_ids or department_ids or search:
        query = _join_departments_for_filter(query)
    if distributor_ids:
        query = query.filter(CustomerModel.distributor_id.in_(distributor_ids))
    if customer_ids:
        query = query.filter(DepartmentModel.customer_id.in_(customer_ids))
    if department_ids:
        query = query.filter(
            or_(
                UserModel.department_id.in_(department_ids),
                user_department_table.c.department_id.in_(department_ids),
            )
        )
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

    query = query.distinct()
    total = query.count()
    users = (
        query.order_by(UserModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [_serialize_user(user) for user in users]
    return items, total

def get_user_with_relations(db: Session, user_id: int):
    """Get a single user enriched with department and customer names."""
    user = _base_user_query(db).filter(UserModel.id == user_id).first()
    if not user:
        return None
    return _serialize_user(user)


# ==================== Update ====================
def update_user(db: Session, db_user: UserModel, user_update: UserUpdate | UserProfilePictureUpdate | BaseModel):
    """Update user"""
    
    update_data = user_update.model_dump(exclude_unset=True)
    
    # Hash password if it's being updated
    if "password" in update_data:
        update_data["password"] = get_password_hash(update_data["password"])
    department_ids = update_data.pop("department_ids", None)
    
    for field, value in update_data.items():
        setattr(db_user, field, value)
    if department_ids is not None:
        _sync_user_departments(db, db_user, _normalize_department_ids(department_ids))
    elif "department_id" in update_data:
        _sync_user_departments(db, db_user, _normalize_department_ids([], update_data["department_id"]))
    
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
