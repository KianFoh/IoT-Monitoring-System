from sqlalchemy import Column, BigInteger, DateTime, String, ForeignKey, Boolean, Integer, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Device(Base):
    __tablename__ = "device"

    id = Column(BigInteger, primary_key=True)
    uid = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    department_id = Column(BigInteger, ForeignKey("department.id", ondelete="SET NULL"), nullable=False)
    is_online = Column(Boolean, default=False, nullable=False)
    machine = Column(String, nullable=True)
    data_interval = Column(Integer, default=60, nullable=False) # in seconds
    dashboard_config = Column(JSON, nullable=True, default=dict) # JSON field for dashboard configuration
    # Example config:
    '''
    {
        "fields": {
            "temperature": {
                "unit": "°C",
                "min": 20,
                "max": 80,
                "visualization": "line",
                "granularity": {
                    "unit": "minute",
                    "step": 3
                }
            }
            "humidity": {
                "unit": "%",
                "min": 0,
                "max": 100,
                "visualization": "gauge",
            }
        }
    }
    '''

    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    department = relationship("Department", back_populates="devices")
