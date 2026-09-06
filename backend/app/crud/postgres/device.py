from typing import Optional

from sqlalchemy import false, func, or_
from sqlalchemy.orm import Session
from app.models.device import Device as DeviceModel
from app.models.department import Department as DepartmentModel
from app.models.customer import Customer as CustomerModel
from app.models.distributor import Distributor as DistributorModel
from app.schemas.device import DeviceCreate, DeviceUpdate, DeviceRecentOut, DeviceOut

# ==================== Create ====================
def create_device(db: Session, device: DeviceCreate):
    """Create new device"""
    db_device = DeviceModel(
        uid=device.uid,
        name=device.name,
        machine_series_number=device.machine_series_number,
        installation_date=device.installation_date,
        department_id=device.department_id,
        data_interval=device.data_interval,
        machine=device.machine,
        connectivity=device.connectivity,
        mobile_number=device.mobile_number,
        sim_id=device.sim_id,
        dashboard_config=getattr(device, "dashboard_config", None),
        is_active=getattr(device, "is_active", False),
    )
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

# ==================== Read ====================
def get_device(db: Session, device_id: int):
    """Get device by ID"""
    return db.query(DeviceModel).filter(DeviceModel.id == device_id).first()

def get_device_by_uid(db: Session, uid: str):
    """Get device by UID"""
    return db.query(DeviceModel).filter(DeviceModel.uid == uid).first()

def _base_device_query(db: Session):
    """Base query joining department and customer for enrichment."""
    return (
        db.query(
            DeviceModel,
            DepartmentModel.name.label("department_name"),
            DepartmentModel.mqtt_topic.label("department_mqtt_topic"),
            CustomerModel.name.label("customer_name"),
            CustomerModel.mqtt_topic.label("customer_mqtt_topic"),
            DistributorModel.name.label("distributor_name"),
            DistributorModel.mqtt_topic.label("distributor_mqtt_topic"),
        )
        .outerjoin(DepartmentModel, DeviceModel.department_id == DepartmentModel.id)
        .outerjoin(CustomerModel, DepartmentModel.customer_id == CustomerModel.id)
        .outerjoin(DistributorModel, CustomerModel.distributor_id == DistributorModel.id)
    )

def _serialize_device_row(row) -> DeviceOut:
    device, department_name, department_mqtt_topic, customer_name, customer_mqtt_topic, distributor_name, distributor_mqtt_topic = row
    department_name = department_name or ""
    department_mqtt_topic = department_mqtt_topic or department_name
    customer_name = customer_name or ""
    customer_mqtt_topic = customer_mqtt_topic or customer_name
    distributor_mqtt_topic = distributor_mqtt_topic or distributor_name
    return DeviceOut.model_validate(
        {
            "id": device.id,
            "uid": device.uid,
            "name": device.name,
            "machine_series_number": device.machine_series_number,
            "installation_date": device.installation_date,
            "machine": device.machine,
            "connectivity": device.connectivity,
            "mobile_number": device.mobile_number,
            "sim_id": device.sim_id,
            "data_interval": device.data_interval,
            "dashboard_config": device.dashboard_config,
            "is_online": device.is_online,
            "is_active": device.is_active,
            "department_name": department_name,
            "department_mqtt_topic": department_mqtt_topic,
            "customer_name": customer_name,
            "customer_mqtt_topic": customer_mqtt_topic,
            "distributor_name": distributor_name,
            "distributor_mqtt_topic": distributor_mqtt_topic,
            "created_at": device.created_at,
        }
    )

def get_devices(
    db: Session,
    search: Optional[str] = None,
    page: int = 1,
    page_size: int = 10,
    department_id: Optional[int] = None,
    department_ids: Optional[list[int]] = None,
    distributor_ids: Optional[list[int]] = None,
    customer_ids: Optional[list[int]] = None,
    filter_department_ids: Optional[list[int]] = None,
    include_customer_name: bool = True,
    include_department_name: bool = True,
    include_machine_name: bool = True,
):
    """Get devices with optional search and pagination, enriched with customer/department names."""
    query = _base_device_query(db)
    distributor_ids = distributor_ids or []
    customer_ids = customer_ids or []
    filter_department_ids = filter_department_ids or []

    if department_ids is not None:
        query = query.filter(DeviceModel.department_id.in_(department_ids) if department_ids else false())
    elif department_id is not None:
        query = query.filter(DeviceModel.department_id == department_id)

    if distributor_ids:
        query = query.filter(CustomerModel.distributor_id.in_(distributor_ids))
    if customer_ids:
        query = query.filter(DepartmentModel.customer_id.in_(customer_ids))
    if filter_department_ids:
        query = query.filter(DeviceModel.department_id.in_(filter_department_ids))

    if search:
        like = f"%{search.lower()}%"
        filters = [
            func.lower(DeviceModel.uid).like(like),
            func.lower(DeviceModel.name).like(like),
        ]
        if include_machine_name:
            filters.append(func.lower(DeviceModel.machine).like(like))
        if include_department_name:
            filters.append(func.lower(DepartmentModel.name).like(like))
        if include_customer_name:
            filters.append(func.lower(CustomerModel.name).like(like))
        query = query.filter(or_(*filters))

    total = query.count()
    rows = (
        query.order_by(DeviceModel.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    items = [_serialize_device_row(row) for row in rows]
    return items, total

def get_device_with_relations(db: Session, device_id: int):
    """Get a single device enriched with customer/department names."""
    row = _base_device_query(db).filter(DeviceModel.id == device_id).first()
    if not row:
        return None
    return _serialize_device_row(row)

def get_device_with_relations_by_uid(db: Session, device_uid: str):
    """Get a single device enriched with customer/department names by UID."""
    row = _base_device_query(db).filter(DeviceModel.uid == device_uid).first()
    if not row:
        return None
    return _serialize_device_row(row)

def get_devices_by_customer_id(db: Session, customer_id: int) -> list[DeviceOut]:
    """Get all devices for a customer with topic routing metadata."""
    rows = (
        _base_device_query(db)
        .filter(DepartmentModel.customer_id == customer_id)
        .all()
    )
    return [_serialize_device_row(row) for row in rows]

def get_devices_by_distributor_id(db: Session, distributor_id: int) -> list[DeviceOut]:
    """Get all devices under a distributor with topic routing metadata."""
    rows = (
        _base_device_query(db)
        .filter(CustomerModel.distributor_id == distributor_id)
        .all()
    )
    return [_serialize_device_row(row) for row in rows]

def get_devices_by_department_id(db: Session, department_id: int) -> list[DeviceOut]:
    """Get all devices for a department with topic routing metadata."""
    rows = (
        _base_device_query(db)
        .filter(DeviceModel.department_id == department_id)
        .all()
    )
    return [_serialize_device_row(row) for row in rows]

# ==================== Update ====================
def update_device(db: Session, db_device: DeviceModel, device_update: DeviceUpdate):
    """Update device"""
    
    update_data = device_update.model_dump(exclude_unset=True)
    
    for field, value in update_data.items():
        setattr(db_device, field, value)
    
    db.commit()
    db.refresh(db_device)
    return db_device
# ==================== Delete ====================
def delete_device(db: Session, device_id: int):
    """Delete device"""
    db_device = get_device(db, device_id)
    if db_device:
        db.delete(db_device)
        db.commit()
        return True
    return False

# ==================== Count ====================
def count_devices(db: Session):
    """Count total number of devices."""
    return db.query(DeviceModel).count()

# ==================== Recent Devices ====================
def get_recent_devices(db: Session, limit: int = 5):
    """Get recently added devices enriched with department and customer names.

    Returns a list of DeviceRecentOut items containing:
    - id, uid, name, is_online (from device)
    - department_name (nullable)
    - customer_name (nullable)
    """
    rows = (
        db.query(
            DeviceModel,
            DepartmentModel.name.label("department_name"),
            DepartmentModel.mqtt_topic.label("department_mqtt_topic"),
            CustomerModel.name.label("customer_name"),
            CustomerModel.mqtt_topic.label("customer_mqtt_topic"),
        )
        .outerjoin(DepartmentModel, DeviceModel.department_id == DepartmentModel.id)
        .outerjoin(CustomerModel, DepartmentModel.customer_id == CustomerModel.id)
        .order_by(DeviceModel.created_at.desc())
        .limit(limit)
        .all()
    )

    results = []
    for device, department_name, department_mqtt_topic, customer_name, customer_mqtt_topic in rows:
        results.append(
            DeviceRecentOut.model_validate(
                {
                    "id": device.id,
                    "uid": device.uid,
                    "name": device.name,
                    "is_online": device.is_online,
                    "department_name": department_name or "",
                    "department_mqtt_topic": department_mqtt_topic or department_name or "",
                    "customer_name": customer_name or "",
                    "customer_mqtt_topic": customer_mqtt_topic or customer_name or "",
                }
            )
        )
    return results
