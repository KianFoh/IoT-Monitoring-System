from sqlalchemy import Column, BigInteger, String, ForeignKey
from app.core.postgresql import Base


class Department(Base):
    __tablename__ = "department"

    id = Column(BigInteger, primary_key=True)
    customer_id = Column(BigInteger, ForeignKey("customer.id"), nullable=False)
    name = Column(String, nullable=False)
