from sqlalchemy import Column, BigInteger, String, ForeignKey, Boolean, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base


class MqttUser(Base):
    __tablename__ = "mqtt_user"

    id = Column(BigInteger, primary_key=True)
    username = Column(String, unique=True, nullable=False)
    password = Column(String, nullable=False)
    customer_id = Column(BigInteger, ForeignKey("customer.id"), nullable=False)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    customer = relationship("Customer", back_populates="mqtt_user")
