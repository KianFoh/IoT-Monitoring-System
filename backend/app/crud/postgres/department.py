from typing import Optional
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.models.department import Department as DepartmentModel
from app.models.customer import Customer as CustomerModel
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut

# ==================== Create ====================
def create_department(db: Session, department: DepartmentCreate):
    """Create new department"""
    db_department = DepartmentModel(
        name=department.name,
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

def get_department_by_name(db: Session, name: str):
    """Get department by name"""
    return db.query(DepartmentModel).filter(DepartmentModel.name == name).first()


def _base_department_query(db: Session):
    """Base query joining customers for enrichment."""
    return (
        db.query(
            DepartmentModel,
            CustomerModel.name.label("customer_name"),
        )
        .join(CustomerModel, DepartmentModel.customer_id == CustomerModel.id)
    )

def _serialize_department_row(row) -> DepartmentOut:
    department, customer_name = row
    return DepartmentOut.model_validate(
        {
            "id": department.id,
            "name": department.name,
            "customer_id": department.customer_id,
            "customer_name": customer_name,
            "is_active": department.is_active,
            "created_at": department.created_at,
        }
    )

def get_departments(db: Session, search: Optional[str] = None, page: int = 1, page_size: int = 10):
    """Get all departments with pagination and optional search."""
    query = _base_department_query(db)
    if search:
        like = f"%{search.lower()}%"
        query = query.filter(
            or_(
                func.lower(DepartmentModel.name).like(like),
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

def search_departments_by_name(db: Session, name: str, limit: int = 10, customer_id: Optional[int] = None):
    """Simple autocomplete search by name, optionally scoped by customer."""
    pattern = f"%{name}%"
    query = db.query(DepartmentModel.id, DepartmentModel.name).filter(DepartmentModel.name.ilike(pattern))
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
