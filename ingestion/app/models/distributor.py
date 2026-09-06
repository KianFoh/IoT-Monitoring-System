from sqlalchemy import Column, BigInteger, String
from app.core.postgresql import Base


class Distributor(Base):
    __tablename__ = "distributor"

    id = Column(BigInteger, primary_key=True)
    name = Column(String, unique=True, nullable=False)
    subdomain = Column(String, unique=True, nullable=False)
    mqtt_topic = Column(String, unique=True, nullable=False)
