from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.models.customer import Customer as CustomerModel
from app.schemas.customer import CustomerCreate, CustomerUpdate

# ==================== Read ====================
def get_customer(db: Session, customer_id: int):
    """Get a customer by ID."""
    return db.get(CustomerModel, customer_id)

def get_customers(db: Session, search: str | None = None, page: int = 1, page_size: int = 10):
    """Get a list of customers with pagination and optional search (name or phone)."""
    query = db.query(CustomerModel)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                CustomerModel.name.ilike(like),
                CustomerModel.phone_no.ilike(like)
            )
        )
    total = query.count()
    items = (
        query.order_by(CustomerModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return items, total

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
