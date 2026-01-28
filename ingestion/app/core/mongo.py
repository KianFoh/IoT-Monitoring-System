from pymongo import MongoClient
from pymongo.collection import Collection
from app.core.config import settings

# Create a single shared MongoDB client instance
_mongo_client = MongoClient(
    host=settings.MONGO_HOST,
    port=settings.MONGO_PORT,
    username=settings.MONGO_USER,
    password=settings.MONGO_PASSWORD,
    authSource=settings.MONGO_AUTH_SOURCE,
)
_db = _mongo_client[settings.MONGO_DB_NAME]
_data_collection = _db[settings.MONGO_COLLECTION]
_latest_collection = _db[settings.MONGO_LATEST_COLLECTION]

def get_collection() -> Collection:
    """Return the historical device data collection (backwards-compatible alias)."""
    return _data_collection

def get_data_collection() -> Collection:
    """Return the collection for historical device data."""
    return _data_collection

def get_latest_collection() -> Collection:
    """Return the collection for latest device data."""
    return _latest_collection

def test_mongo_connection() -> bool:
    """Ping the Mongo server to verify connectivity."""
    try:
        _mongo_client.admin.command("ping")
        return True
    except Exception:
        return False