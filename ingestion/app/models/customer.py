from sqlalchemy import Column, BigInteger, String
from app.core.postgresql import Base


class Customer(Base):
    __tablename__ = "customer"

    id = Column(BigInteger, primary_key=True)
    name = Column(String, unique=True, nullable=False)
