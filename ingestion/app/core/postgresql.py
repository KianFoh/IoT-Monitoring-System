from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from app.core.config import settings

# Build database URL
database_url = f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"

engine = create_engine(database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()