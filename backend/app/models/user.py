from sqlalchemy import Boolean, Column, BigInteger, String, DateTime, ForeignKey, Enum, func , Integer
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.enum.user_role import UserRole
from app.models.user_department import user_department_table


class User(Base):
    __tablename__ = "user"

    id = Column(BigInteger, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    username = Column(String, nullable=True)
    profile_picture = Column(String, nullable=True)
    password = Column(String, nullable=True)
    department_id = Column(BigInteger, ForeignKey("department.id"), nullable=True)
    role = Column(
        Enum(UserRole, name="user_role"),
        nullable=False,
        default=UserRole.user
    )

    is_verified = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    one_time_token_version = Column(Integer, default=0, nullable=False)
    refresh_token_version = Column(Integer, default=0, nullable=False)

    last_login = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    department = relationship("Department", foreign_keys=[department_id])
    departments = relationship(
        "Department",
        secondary=user_department_table,
        back_populates="users",
    )
