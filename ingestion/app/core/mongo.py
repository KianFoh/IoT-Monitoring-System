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

def get_collection() -> Collection:
    """Return the collection for device data."""
    return _db[settings.MONGO_COLLECTION]

def test_mongo_connection() -> bool:
    """Ping the Mongo server to verify connectivity."""
    try:
        _mongo_client.admin.command("ping")
        return True
    except Exception:
        return False