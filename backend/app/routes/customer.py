from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_current_user, require_role
from app.utils.ws_events import broadcast_customer_event
from app.crud.postgres import customer as customer_crud
from app.models.user import User as UserModel
from app.models.enum.user_role import UserRole
from app.schemas.customer import CustomerCreate, CustomerSearch, CustomerUpdate, CustomerOut, CustomerListResponse

router = APIRouter(prefix="/customers", tags=["customers"])

# ==================== Count ====================
@router.get("/count", response_model=int)
def count_customers(
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Count total number of customers."""
    require_role(current_user, [UserRole.superuser])
    
    total_customers = customer_crud.count_customers(db)
    return total_customers

# ==================== Create ====================
@router.post("/", response_model=CustomerOut, status_code=status.HTTP_201_CREATED)
async def create_customer(
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
    customer_out = customer_crud.get_customer_with_references(db, db_customer.id) or CustomerOut.model_validate(
        {
            "id": db_customer.id,
            "name": db_customer.name,
            "phone_no": db_customer.phone_no,
            "is_active": db_customer.is_active,
            "created_at": db_customer.created_at,
            "is_deletable": True,
        }
    )
    await broadcast_customer_event("add", customer_out)
    return customer_out


# ==================== Read (List) ====================
@router.get("/", response_model=CustomerListResponse)
def list_customers(
    search: str | None = Query(None, description="Search by name"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all customers with pagination."""
    require_role(current_user, [UserRole.superuser])

    items, total = customer_crud.get_customers(
        db,
        search=search.strip() if search else None,
        page=page,
        page_size=page_size,
    )
    return CustomerListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )

# ==================== Search (Autocomplete) ====================
@router.get("/search", response_model=list[CustomerSearch])
def search_customers(
    name: str = Query(..., min_length=1, description="Partial customer name"),
    limit: int = Query(10, ge=1, le=100),
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search customers by name (for autocomplete)."""
    require_role(current_user, [UserRole.superuser])
    return customer_crud.search_customers_by_name(db, name, limit=limit)


# ==================== Read (Single) ====================
@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(
    customer_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get customer by ID."""
    require_role(current_user, [UserRole.superuser])

    customer = customer_crud.get_customer_with_references(db, customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Customer not found"
        )
    return customer


# ==================== Update ====================
@router.patch("/{customer_id}", response_model=CustomerOut)
async def update_customer(
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
    customer_out = customer_crud.get_customer_with_references(db, customer_id) or CustomerOut.model_validate(
        {
            "id": db_customer.id,
            "name": db_customer.name,
            "phone_no": db_customer.phone_no,
            "is_active": db_customer.is_active,
            "created_at": db_customer.created_at,
            "is_deletable": True,
        }
    )
    await broadcast_customer_event("update", customer_out)
    return customer_out


# ==================== Delete ====================
@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer(
    customer_id: int,
    current_user: UserModel = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete customer."""
    require_role(current_user, [UserRole.superuser])
    
    db_customer = customer_crud.get_customer(db, customer_id)
    if not db_customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    if customer_crud.customer_has_references(db, customer_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Customer is referenced by other records",
        )

    success = customer_crud.delete_customer(db, customer_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    await broadcast_customer_event("delete", {"id": customer_id})
