from sqlalchemy import Boolean, Column, BigInteger, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class Department(Base):
    __tablename__ = "department"

    id = Column(BigInteger, primary_key=True)
    customer_id = Column(BigInteger, ForeignKey("customer.id"), nullable=False)
    name = Column(String, nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint('customer_id', 'name', name='uq_customer_department'),
    )

    # Relationships
    customer = relationship("Customer", back_populates="departments")
    users = relationship("User", back_populates="department") 
    devices = relationship("Device", back_populates="department")
