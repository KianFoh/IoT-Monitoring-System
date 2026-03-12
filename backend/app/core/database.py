from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from pymongo import MongoClient
from app.core.config import get_settings

settings = get_settings()


# ==================== PostgreSQL ====================
engine = create_engine(
    settings.database_url,
    # Enable multi-threading support for SQLite 
    connect_args={"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Database session dependency"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ==================== MongoDB ====================
mongo_client = MongoClient(settings.mongo_uri_computed)
devices_data_collection = mongo_client[settings.MONGO_DB_NAME][settings.DEVICES_DATA_COLLECTION_NAME]
devices_latest_collection = mongo_client[settings.MONGO_DB_NAME][settings.DEVICES_LATEST_COLLECTION_NAME]
devices_rollup_hour_collection = mongo_client[settings.MONGO_DB_NAME][settings.MONGO_ROLLUP_HOUR_COLLECTION]

def get_mongo_client():
    """Return the shared MongoDB client"""
    return mongo_client

def get_mongo_db():
    """FastAPI dependency to provide the configured Mongo database"""
    db = mongo_client[settings.MONGO_DB_NAME]
    return db

def get_collection(collection_name: str):
    """Get a specific MongoDB collection by name"""
    db = get_mongo_db()
    return db[collection_name]
