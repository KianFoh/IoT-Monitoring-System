from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.customer import Customer as CustomerModel
from app.schemas.customer import CustomerCreate, CustomerUpdate

# ==================== Read ====================
def get_customer(db: Session, customer_id: int) -> Optional[CustomerModel]:
    """Get a customer by ID."""
    return db.get(CustomerModel, customer_id)

def get_customers(db: Session, skip: int = 0, limit: int = 100) -> List[CustomerModel]:
    """Get a list of customers with pagination."""
    return db.query(CustomerModel).offset(skip).limit(limit).all()

def get_customer_by_name(db: Session, name: str) -> Optional[CustomerModel]:
    """Get a customer by name."""
    return db.query(CustomerModel).filter(CustomerModel.name == name).first()

def get_customer_by_name_excluding_id(db: Session, name: str, exclude_id: int) -> Optional[CustomerModel]:
    """Get a customer by name, excluding a specific ID (useful for update uniqueness checks)."""
    return (
        db.query(CustomerModel)
        .filter(CustomerModel.name == name, CustomerModel.id != exclude_id)
        .first()
    )

# ==================== Create ====================
def create_customer(db: Session, customer: CustomerCreate) -> CustomerModel:
    """Create a new customer."""
    db_customer = CustomerModel(name=customer.name, phone_no=customer.phone_no)
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

# ==================== Update ====================
def update_customer(db: Session, customer_id: int, customer: CustomerUpdate) -> Optional[CustomerModel]:
    """Update an existing customer."""
    db_customer = db.get(CustomerModel, customer_id)
    if not db_customer:
        return None
    
    update_data = customer.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(db_customer, field, value)
    
    db.commit()
    db.refresh(db_customer)
    return db_customer

# ==================== Delete ====================
def delete_customer(db: Session, customer_id: int) -> bool:
    """Delete a customer. Returns True if deleted, False if not found."""
    db_customer = db.get(CustomerModel, customer_id)
    if not db_customer:
        return False
    
    db.delete(db_customer)
    db.commit()
    return True