from sqlalchemy import BigInteger, Boolean, CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, JSON, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.core.database import Base


class AlertRule(Base):
    __tablename__ = "alert_rule"

    id = Column(BigInteger, primary_key=True)
    device_id = Column(BigInteger, ForeignKey("device.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    field = Column(String, nullable=False)
    field_label = Column(String, nullable=True)
    field_type = Column(String, nullable=False)
    operator = Column(String, nullable=False)
    value = Column(JSON, nullable=True)
    notification_method = Column(String, nullable=False)
    message = Column(String, nullable=True)
    include_data_in_message = Column(Boolean, default=True, nullable=False)
    cooldown_seconds = Column(Integer, default=300, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    device = relationship("Device", back_populates="alert_rules")

    __table_args__ = (
        CheckConstraint(
            "field_type IN ('text', 'number', 'boolean', 'list')",
            name="ck_alert_rule_field_type",
        ),
        CheckConstraint(
            "operator IN ('==', '!=', 'in', 'not in', '<', '>', '<=', '>=', "
            "'contains', 'not contains', 'contains any', 'contains all', 'is empty')",
            name="ck_alert_rule_operator",
        ),
        CheckConstraint("cooldown_seconds >= 0", name="ck_alert_rule_cooldown_seconds_nonnegative"),
        Index("ix_alert_rule_device_id", "device_id"),
        Index("ix_alert_rule_device_field", "device_id", "field"),
    )
