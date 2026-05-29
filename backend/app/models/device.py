from sqlalchemy import Column, BigInteger, DateTime, String, ForeignKey, Boolean, Integer, JSON, Enum, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.enum.device_connectivity import DeviceConnectivity


class Device(Base):
    __tablename__ = "device"

    id = Column(BigInteger, primary_key=True)
    uid = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    department_id = Column(BigInteger, ForeignKey("department.id", ondelete="SET NULL"), nullable=True)
    is_online = Column(Boolean, default=False, nullable=False)
    machine = Column(String, nullable=True)
    connectivity = Column(
        Enum(DeviceConnectivity, name="device_connectivity"),
        nullable=False,
        default=DeviceConnectivity.wifi,
    )
    mobile_number = Column(String, nullable=True)
    sim_id = Column(String, nullable=True)
    data_interval = Column(Float, default=60.0, nullable=False) # in seconds
    dashboard_config = Column(JSON, nullable=True, default=dict) # JSON field for dashboard configuration

    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    
    # Relationships
    department = relationship("Department", back_populates="devices")
    alert_rules = relationship("AlertRule", back_populates="device", cascade="all, delete-orphan")
