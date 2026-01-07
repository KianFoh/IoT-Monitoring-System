from app.core.database import devices_data_collection

def get_by_uid(uid: str, limit: int = 100):
    cursor = (
        devices_data_collection
        .find({"device_id": uid})
        .sort("timestamp", -1)
    )
    return list(cursor)