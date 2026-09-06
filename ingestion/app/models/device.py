import enum

from sqlalchemy import Column, BigInteger, Date, DateTime, String, ForeignKey, Boolean, Integer, Enum, Float, JSON
from sqlalchemy.sql import func
from app.core.postgresql import Base

class DeviceConnectivity(enum.Enum):
    wifi = "wifi"
    cellular = "cellular"


class Device(Base):
    __tablename__ = "device"

    id = Column(BigInteger, primary_key=True)
    is_online = Column(Boolean, default=False, nullable=False)
    uid = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    machine_series_number = Column(String, nullable=True)
    installation_date = Column(Date, nullable=True)
    department_id = Column(BigInteger, ForeignKey("department.id", ondelete="SET NULL"), nullable=False)
    connectivity = Column(
        Enum(DeviceConnectivity, name="device_connectivity"),
        nullable=False,
        default=DeviceConnectivity.wifi,
    )
    mobile_number = Column(String, nullable=True)
    sim_id = Column(String, nullable=True)
    data_interval = Column(Float, default=60.0, nullable=False)
    dashboard_config = Column(JSON, nullable=True, default=dict) # JSON field for dashboard configuration
    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
