from pymongo import MongoClient
from pymongo.collection import Collection

from app.core.config import settings


_mongo_client = MongoClient(
    host=settings.MONGO_HOST,
    port=settings.MONGO_PORT,
    username=settings.MONGO_USER,
    password=settings.MONGO_PASSWORD,
    authSource=settings.MONGO_AUTH_SOURCE,
)
_db = _mongo_client[settings.MONGO_DB_NAME]
_rollup_min_collection = _db[settings.MONGO_ROLLUP_MIN_COLLECTION]
_rollup_hour_collection = _db[settings.MONGO_ROLLUP_HOUR_COLLECTION]


def get_rollup_min_collection() -> Collection:
    return _rollup_min_collection


def get_rollup_hour_collection() -> Collection:
    return _rollup_hour_collection


def ensure_indexes() -> None:
    keys = [("device_id", 1), ("ts", 1)]
    _rollup_min_collection.create_index(keys)
    _rollup_hour_collection.create_index(keys)


def test_mongo_connection() -> bool:
    try:
        _mongo_client.admin.command("ping")
        return True
    except Exception:
        return False
