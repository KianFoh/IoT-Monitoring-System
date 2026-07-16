from sqlalchemy import BigInteger, Column, ForeignKey, String

from app.core.postgresql import Base


class Department(Base):
    __tablename__ = "department"

    id = Column(BigInteger, primary_key=True)
    name = Column(String, nullable=False)
    customer_id = Column(BigInteger, ForeignKey("customer.id"), nullable=False)
