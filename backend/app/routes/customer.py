from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.crud.postgres import customer as customer_crud
from app.models.user import User as UserModel
from app.models.enum.user_role import UserRole
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerOut

router = APIRouter(prefix="/customers", tags=["customers"])


# ==================== Create ====================
@router.post("/", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer: CustomerCreate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new customer"""
    require_role(current_user, [UserRole.superuser])
    
    existing_customer = customer_crud.get_customer_by_name(db, customer.name)
    if existing_customer:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer name already exists"
        )
    
    db_customer = customer_crud.create_customer(db, customer)
    return db_customer


# ==================== Read (List) ====================
@router.get("/", response_model=list[CustomerOut])
def list_customers(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all customers with pagination."""
    require_role(current_user, [UserRole.superuser])

    customers = customer_crud.get_customers(db, skip=skip, limit=limit)
    return customers


# ==================== Read (Single) ====================
@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get customer by ID."""
    require_role(current_user, [UserRole.superuser])

    customer = customer_crud.get_customer(db, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    return customer


# ==================== Update ====================
@router.patch("/{customer_id}", response_model=CustomerOut)
def update_customer(
    customer_id: int,
    customer_update: CustomerUpdate,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update customer"""
    require_role(current_user, [UserRole.superuser])
    
    db_customer = customer_crud.get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    
    # Check if new name already exists (excluding current customer)
    if customer_update.name:
        existing_customer = customer_crud.get_customer_by_name_excluding_id(
            db, customer_update.name, customer_id
        )
        if existing_customer:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Customer name already exists"
            )
    
    db_customer = customer_crud.update_customer(db, customer_id, customer_update)
    return db_customer


# ==================== Delete ====================
@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_customer(
    customer_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete customer."""
    require_role(current_user, [UserRole.superuser])
    
    success = customer_crud.delete_customer(db, customer_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )