from sqlalchemy import BigInteger, Boolean, Column, Float, ForeignKey, JSON, String

from app.core.postgresql import Base


class Device(Base):
    __tablename__ = "device"

    id = Column(BigInteger, primary_key=True)
    uid = Column(String, unique=True, nullable=False)
    department_id = Column(BigInteger, ForeignKey("department.id"), nullable=True)
    data_interval = Column(Float, default=60.0, nullable=False)
    dashboard_config = Column(JSON, nullable=True, default=dict)
    is_active = Column(Boolean, default=False, nullable=False)
