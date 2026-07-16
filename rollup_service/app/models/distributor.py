from sqlalchemy import BigInteger, Column, String

from app.core.postgresql import Base


class Distributor(Base):
    __tablename__ = "distributor"

    id = Column(BigInteger, primary_key=True)
    name = Column(String, nullable=False)
