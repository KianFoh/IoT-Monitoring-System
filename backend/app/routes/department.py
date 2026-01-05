from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.crud.postgres import department as department_crud
from app.crud.postgres import customer as customer_crud
from app.models.user import User as UserModel
from app.schemas.department import DepartmentCreate, DepartmentUpdate, DepartmentOut
from app.models.enum.user_role import UserRole
from app.utils.ws_events import broadcast_department_event

router = APIRouter(prefix="/departments", tags=["departments"])

# ==================== Count ====================
@router.get("/count", response_model=int)
def count_departments(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Count total number of departments."""
    require_role(current_user, [UserRole.superuser])
    return department_crud.count_departments(db)

# ==================== Create ====================
@router.post("/", response_model=DepartmentOut, status_code=status.HTTP_201_CREATED)
async def create_department(
    department: DepartmentCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new department"""
    require_role(current_user, [UserRole.superuser])
    
    # Check if department already exists
    unique_department = department_crud.check_department_name_unique(db, department.customer_id, department.name)
    if not unique_department:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Department with this name already exists"
        )
    
    customer = customer_crud.get_customer(db, department.customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    db_department = department_crud.create_department(db, department)
    await broadcast_department_event("add", DepartmentOut.model_validate(db_department, from_attributes=True))
    return db_department


# ==================== Read (List) ====================
@router.get("/", response_model=List[DepartmentOut])
def get_departments(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all departments with pagination."""
    require_role(current_user, [UserRole.superuser])

    return department_crud.get_departments(db, skip=skip, limit=limit)


# ==================== Read (Single) ====================
@router.get("/{department_id}", response_model=DepartmentOut)
def get_department(
    department_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get department by ID."""
    require_role(current_user, [UserRole.superuser])

    department = department_crud.get_department(db, department_id)
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    return department


# ==================== Update ====================
@router.patch("/{department_id}", response_model=DepartmentOut)
async def update_department(
    department_id: int,
    department_update: DepartmentUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update department"""
    require_role(current_user, [UserRole.superuser])
    
    # Check if department exists
    existing_department = department_crud.get_department(db, department_id)
    if not existing_department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    # Check if new name already exists
    if department_update.name:
        unique_department = department_crud.check_department_name_unique(db, existing_department.customer_id, department_update.name, existing_department.id)
        if not unique_department:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Department with this name already exists for the customer"
            )
    if department_update.customer_id:
        customer = customer_crud.get_customer(db, department_update.customer_id)
        if not customer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found"
            )
    
    updated_department = department_crud.update_department(db, department_id, department_update)
    await broadcast_department_event("update", DepartmentOut.model_validate(updated_department, from_attributes=True))
    return updated_department


# ==================== Delete ====================
@router.delete("/{department_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_department(
    department_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete department"""
    require_role(current_user, [UserRole.superuser])
    
    # Check if department exists
    department = department_crud.get_department(db, department_id)
    if not department:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Department not found"
        )
    
    department_crud.delete_department(db, department_id)
    await broadcast_department_event("delete", {"id": department_id})