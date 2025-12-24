from typing import Optional
from sqlalchemy.orm import Session
from app.models.department import Department as DepartmentModel
from app.schemas.department import DepartmentCreate, DepartmentUpdate

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


def get_departments(db: Session, skip: int = 0, limit: int = 10):
    """Get all departments with pagination"""
    return db.query(DepartmentModel).offset(skip).limit(limit).all()

# ==================== Update ====================
def update_department(db: Session, department_id: int, department_update: DepartmentUpdate):
    """Update department"""
    db_department = get_department(db, department_id)
    if not db_department:
        return None
    
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