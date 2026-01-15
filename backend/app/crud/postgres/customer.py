from sqlalchemy.orm import Session
from app.models.customer import Customer as CustomerModel
from app.schemas.customer import CustomerCreate, CustomerUpdate

# ==================== Read ====================
def get_customer(db: Session, customer_id: int):
    """Get a customer by ID."""
    return db.get(CustomerModel, customer_id)

def get_customers(db: Session, skip: int = 0, limit: int = 100):
    """Get a list of customers with pagination."""
    return db.query(CustomerModel).offset(skip).limit(limit).all()

def search_customers_by_name(db: Session, name: str, limit: int = 10):
    """Simple autocomplete search by name prefix/contains — return only id and name."""
    pattern = f"%{name}%"
    rows = (
        db.query(CustomerModel.id, CustomerModel.name)
        .filter(CustomerModel.name.ilike(pattern))
        .order_by(CustomerModel.name.asc())
        .limit(limit)
        .all()
    )
    return [{"id": r[0], "name": r[1]} for r in rows]

def get_customer_by_name(db: Session, name: str):
    """Get a customer by name."""
    return db.query(CustomerModel).filter(CustomerModel.name == name).first()

def get_customer_by_name_excluding_id(db: Session, name: str, exclude_id: int):
    """Get a customer by name, excluding a specific ID (useful for update uniqueness checks)."""
    return (
        db.query(CustomerModel)
        .filter(CustomerModel.name == name, CustomerModel.id != exclude_id)
        .first()
    )

# ==================== Create ====================
def create_customer(db: Session, customer: CustomerCreate):
    """Create a new customer."""
    db_customer = CustomerModel(name=customer.name, phone_no=customer.phone_no)
    db.add(db_customer)
    db.commit()
    db.refresh(db_customer)
    return db_customer

# ==================== Update ====================
def update_customer(db: Session, customer_id: int, customer: CustomerUpdate):
    """Update an existing customer."""
    db_customer = db.get(CustomerModel, customer_id)
    
    update_data = customer.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(db_customer, field, value)
    
    db.commit()
    db.refresh(db_customer)
    return db_customer

# ==================== Delete ====================
def delete_customer(db: Session, customer_id: int):
    """Delete a customer. Returns True if deleted, False if not found."""
    db_customer = db.get(CustomerModel, customer_id)
    if not db_customer:
        return False
    
    db.delete(db_customer)
    db.commit()
    return True

# ==================== Count ====================
def count_customers(db: Session):
    """Count total number of customers."""
    return db.query(CustomerModel).count()
