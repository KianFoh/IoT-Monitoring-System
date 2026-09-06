from typing import Optional
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.models.department import Department as DepartmentModel
from app.models.customer import Customer as CustomerModel
from app.models.device import Device as DeviceModel
from app.models.user import User as UserModel
from app.models.user_department import user_department_table
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut

# ==================== Create ====================
def create_department(db: Session, department: DepartmentCreate):
    """Create new department"""
    db_department = DepartmentModel(
        name=department.name,
        mqtt_topic=department.mqtt_topic or department.name,
        customer_id=department.customer_id
    )
    db.add(db_department)
    db.commit()
    db.refresh(db_department)
    return db_department

# ==================== Read ====================
def get_department(db: Session, department_id: int):
    """Get department by ID"""
    return db.query(DepartmentModel).filter(DepartmentModel.id == department_id).first()

def get_departments_by_ids(db: Session, department_ids: list[int]):
    """Get departments by IDs."""
    if not department_ids:
        return []
    return db.query(DepartmentModel).filter(DepartmentModel.id.in_(department_ids)).all()

def get_department_by_name(db: Session, name: str):
    """Get department by name"""
    return db.query(DepartmentModel).filter(DepartmentModel.name == name).first()

def get_department_by_mqtt_topic(db: Session, customer_id: int, mqtt_topic: str):
    """Get department by MQTT topic within a customer."""
    return (
        db.query(DepartmentModel)
        .filter(DepartmentModel.customer_id == customer_id, DepartmentModel.mqtt_topic == mqtt_topic)
        .first()
    )

def get_department_by_mqtt_topic_excluding_id(
    db: Session,
    customer_id: int,
    mqtt_topic: str,
    exclude_department_id: int,
):
    """Get department by MQTT topic within a customer, excluding one department."""
    return (
        db.query(DepartmentModel)
        .filter(
            DepartmentModel.customer_id == customer_id,
            DepartmentModel.mqtt_topic == mqtt_topic,
            DepartmentModel.id != exclude_department_id,
        )
        .first()
    )


def _base_department_query(db: Session):
    """Base query joining customers for enrichment."""
    has_devices = (
        db.query(DeviceModel.id)
        .filter(DeviceModel.department_id == DepartmentModel.id)
        .exists()
    )
    has_users = (
        db.query(user_department_table.c.user_id)
        .filter(user_department_table.c.department_id == DepartmentModel.id)
        .exists()
    )
    return (
        db.query(
            DepartmentModel,
            CustomerModel.name.label("customer_name"),
            has_devices.label("has_devices"),
            has_users.label("has_users"),
        )
        .join(CustomerModel, DepartmentModel.customer_id == CustomerModel.id)
    )

def _serialize_department_row(row) -> DepartmentOut:
    department, customer_name, has_devices, has_users = row
    is_deletable = not (has_devices or has_users)
    return DepartmentOut.model_validate(
        {
            "id": department.id,
            "name": department.name,
            "mqtt_topic": department.mqtt_topic,
            "customer_id": department.customer_id,
            "customer_name": customer_name,
            "is_active": department.is_active,
            "created_at": department.created_at,
            "is_deletable": is_deletable,
        }
    )

def get_departments(
    db: Session,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
    distributor_ids: Optional[list[int]] = None,
    customer_ids: Optional[list[int]] = None,
):
    """Get all departments with pagination, optional search, and hierarchy filters."""
    query = _base_department_query(db)
    distributor_ids = distributor_ids or []
    customer_ids = customer_ids or []

    if distributor_ids:
        query = query.filter(CustomerModel.distributor_id.in_(distributor_ids))
    if customer_ids:
        query = query.filter(DepartmentModel.customer_id.in_(customer_ids))

    if search:
        like = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(DepartmentModel.name).like(like),
                func.lower(DepartmentModel.mqtt_topic).like(like),
                func.lower(CustomerModel.name).like(like),
            )
        )
    total = query.count()
    rows = (
        query.order_by(DepartmentModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [_serialize_department_row(row) for row in rows]
    return items, total

def get_department_with_customer(db: Session, department_id: int):
    """Get a single department enriched with customer name."""
    row = _base_department_query(db).filter(DepartmentModel.id == department_id).first()
    if not row:
        return None
    return _serialize_department_row(row)

def department_has_references(db: Session, department_id: int) -> bool:
    """Return True if the department is referenced by other tables."""
    has_device = (
        db.query(DeviceModel.id)
        .filter(DeviceModel.department_id == department_id)
        .first()
        is not None
    )
    if has_device:
        return True
    has_user = (
        db.query(UserModel.id)
        .outerjoin(user_department_table, UserModel.id == user_department_table.c.user_id)
        .filter(or_(UserModel.department_id == department_id, user_department_table.c.department_id == department_id))
        .first()
        is not None
    )
    return has_user

def search_departments_by_name(db: Session, name: str, limit: int = 10, customer_id: Optional[int] = None):
    """Simple autocomplete search by name, optionally scoped by customer."""
    pattern = f"%{name}%"
    query = db.query(DepartmentModel.id, DepartmentModel.name).filter(
        or_(DepartmentModel.name.ilike(pattern), DepartmentModel.mqtt_topic.ilike(pattern))
    )
    if customer_id is not None:
        query = query.filter(DepartmentModel.customer_id == customer_id)
    rows = (
        query
        .order_by(DepartmentModel.name.asc())
        .limit(limit)
        .all()
    )   
    return [{"id": r[0], "name": r[1]} for r in rows]

# ==================== Update ====================
def update_department(db: Session, department_id: int, department_update: DepartmentUpdate):
    """Update department."""
    db_department = get_department(db, department_id)
    
    update_data = department_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_department, field, value)
    
    db.commit()
    db.refresh(db_department)
    return db_department

# ==================== Delete ====================
def delete_department(db: Session, department_id: int):
    """Delete department"""
    db_department = get_department(db, department_id)
    if db_department:
        db.delete(db_department)
        db.commit()
        return True
    return False

# ==================== Validation ====================
def check_department_name_unique(db: Session, customer_id: int, name: str, exclude_department_id: Optional[int] = None):
    """
    Check if a department name already exists for a specific customer.
    Raises HTTPException if it exists.
    """
    query = db.query(DepartmentModel).filter(DepartmentModel.customer_id == customer_id,DepartmentModel.name == name)

    if exclude_department_id:
        query = query.filter(DepartmentModel.id != exclude_department_id)

    existing_department = query.first()
    return existing_department is None

# ==================== Count ====================
def count_departments(db: Session):
    """Count total number of departments."""
    return db.query(DepartmentModel).count()
