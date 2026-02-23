from sqlalchemy import Column, BigInteger, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Customer(Base):
    __tablename__ = "customer"

    id = Column(BigInteger, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    phone_no = Column(String, nullable=True)
    distributor_id = Column(BigInteger, ForeignKey("distributor.id", ondelete="SET NULL"), nullable=True)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    distributor = relationship("Distributor", back_populates="customers")
    departments = relationship("Department", back_populates="customer")
    mqtt_user = relationship("MqttUser", back_populates="customer", uselist=False)