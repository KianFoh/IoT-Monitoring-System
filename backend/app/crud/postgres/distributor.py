from sqlalchemy.orm import Session
from sqlalchemy import or_, func
from app.models.distributor import Distributor as DistributorModel
from app.models.customer import Customer as CustomerModel
from app.schemas.distributor import DistributorCreate, DistributorUpdate, DistributorOut


def _base_distributor_query(db: Session):
    """Base query to fetch distributors with reference flags."""
    has_customers = (
        db.query(CustomerModel.id)
        .filter(CustomerModel.distributor_id == DistributorModel.id)
        .exists()
    )
    return db.query(
        DistributorModel,
        has_customers.label("has_customers"),
    )


def _serialize_distributor_row(row) -> DistributorOut:
    distributor, has_customers = row
    is_deletable = not has_customers
    return DistributorOut.model_validate(
        {
            "id": distributor.id,
            "name": distributor.name,
            "subdomain": distributor.subdomain,
            "mqtt_topic": distributor.mqtt_topic,
            "phone_no": distributor.phone_no,
            "logo_url": distributor.logo_url,
            "is_active": distributor.is_active,
            "created_at": distributor.created_at,
            "is_deletable": is_deletable,
        }
    )


# ==================== Read ====================
def get_distributor(db: Session, distributor_id: int):
    """Get a distributor by ID."""
    return db.get(DistributorModel, distributor_id)


def get_distributor_with_references(db: Session, distributor_id: int):
    """Get a distributor by ID with reference flags."""
    row = _base_distributor_query(db).filter(DistributorModel.id == distributor_id).first()
    if not row:
        return None
    return _serialize_distributor_row(row)


def get_distributors(db: Session, search: str | None = None, page: int = 1, page_size: int = 10):
    """Get a list of distributors with pagination and optional search (name or phone)."""
    query = _base_distributor_query(db)
    if search:
        like = f"%{search}%"
        query = query.filter(
            or_(
                DistributorModel.name.ilike(like),
                DistributorModel.subdomain.ilike(like),
                DistributorModel.mqtt_topic.ilike(like),
                DistributorModel.phone_no.ilike(like),
            )
        )
    total = query.count()
    rows = (
        query.order_by(DistributorModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [_serialize_distributor_row(row) for row in rows]
    return items, total


def search_distributors_by_name(db: Session, name: str, limit: int = 10):
    """Simple autocomplete search by name prefix/contains -- return only id and name."""
    pattern = f"%{name}%"
    rows = (
        db.query(DistributorModel.id, DistributorModel.name)
        .filter(DistributorModel.name.ilike(pattern))
        .order_by(DistributorModel.name.asc())
        .limit(limit)
        .all()
    )
    return [{"id": r[0], "name": r[1]} for r in rows]


def get_distributor_by_name(db: Session, name: str):
    """Get a distributor by name."""
    return db.query(DistributorModel).filter(DistributorModel.name == name).first()


def get_distributor_by_name_ci(db: Session, name: str):
    """Get a distributor by name (case-insensitive exact match)."""
    return db.query(DistributorModel).filter(func.lower(DistributorModel.name) == name.lower()).first()


def get_distributor_by_subdomain(db: Session, subdomain: str):
    """Get a distributor by subdomain."""
    return db.query(DistributorModel).filter(DistributorModel.subdomain == subdomain).first()


def get_distributor_by_subdomain_ci(db: Session, subdomain: str):
    """Get a distributor by subdomain (case-insensitive exact match)."""
    return db.query(DistributorModel).filter(func.lower(DistributorModel.subdomain) == subdomain.lower()).first()


def get_distributor_by_mqtt_topic(db: Session, mqtt_topic: str):
    """Get a distributor by MQTT topic."""
    return db.query(DistributorModel).filter(DistributorModel.mqtt_topic == mqtt_topic).first()


def get_distributor_by_name_excluding_id(db: Session, name: str, exclude_id: int):
    """Get a distributor by name, excluding a specific ID (useful for update uniqueness checks)."""
    return (
        db.query(DistributorModel)
        .filter(DistributorModel.name == name, DistributorModel.id != exclude_id)
        .first()
    )


def get_distributor_by_subdomain_excluding_id(db: Session, subdomain: str, exclude_id: int):
    """Get a distributor by subdomain, excluding a specific ID."""
    return (
        db.query(DistributorModel)
        .filter(DistributorModel.subdomain == subdomain, DistributorModel.id != exclude_id)
        .first()
    )


def get_distributor_by_mqtt_topic_excluding_id(db: Session, mqtt_topic: str, exclude_id: int):
    """Get a distributor by MQTT topic, excluding a specific ID."""
    return (
        db.query(DistributorModel)
        .filter(DistributorModel.mqtt_topic == mqtt_topic, DistributorModel.id != exclude_id)
        .first()
    )


def distributor_has_references(db: Session, distributor_id: int) -> bool:
    """Return True if the distributor is referenced by customers."""
    return (
        db.query(CustomerModel.id)
        .filter(CustomerModel.distributor_id == distributor_id)
        .first()
        is not None
    )


# ==================== Create ====================
def create_distributor(db: Session, distributor: DistributorCreate):
    """Create a new distributor."""
    db_distributor = DistributorModel(
        name=distributor.name,
        subdomain=(distributor.subdomain or distributor.name).strip(),
        mqtt_topic=(distributor.mqtt_topic or distributor.name).strip(),
        phone_no=distributor.phone_no,
        logo_url=distributor.logo_url,
    )
    db.add(db_distributor)
    db.commit()
    db.refresh(db_distributor)
    return db_distributor


# ==================== Update ====================
def update_distributor(db: Session, distributor_id: int, distributor: DistributorUpdate):
    """Update an existing distributor."""
    db_distributor = db.get(DistributorModel, distributor_id)

    update_data = distributor.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(db_distributor, field, value)

    db.commit()
    db.refresh(db_distributor)
    return db_distributor


# ==================== Delete ====================
def delete_distributor(db: Session, distributor_id: int):
    """Delete a distributor. Returns True if deleted, False if not found."""
    db_distributor = db.get(DistributorModel, distributor_id)
    if not db_distributor:
        return False

    db.delete(db_distributor)
    db.commit()
    return True


# ==================== Count ====================
def count_distributors(db: Session):
    """Count total number of distributors."""
    return db.query(DistributorModel).count()
