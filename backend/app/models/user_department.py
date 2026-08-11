from sqlalchemy import BigInteger, Column, ForeignKey, Table

from app.core.database import Base


user_department_table = Table(
    "user_department",
    Base.metadata,
    Column("user_id", BigInteger, ForeignKey("user.id", ondelete="CASCADE"), primary_key=True),
    Column("department_id", BigInteger, ForeignKey("department.id", ondelete="CASCADE"), primary_key=True),
)
