from sqlalchemy import Column, BigInteger, DateTime, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Device(Base):
    __tablename__ = "device"

    id = Column(BigInteger, primary_key=True)
    department_id = Column(BigInteger, ForeignKey("department.id", ondelete="SET NULL"), nullable=True)
    is_online = Column(Boolean, default=False, nullable=False)
    uid = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)

    is_active = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    department = relationship("Department", back_populates="devices")
