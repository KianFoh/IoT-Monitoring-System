import json
from datetime import datetime, timezone
from typing import Any, Dict

from app.core.mongo import get_collection
from app.utils.logger import logger
from app.models.device import Device
from app.core.postgresql import SessionLocal

class IngestionService:
    """Ingest MQTT JSON payloads directly into MongoDB."""

    def __init__(self):
        self.collection = get_collection()

    def update_device_status(self, uid: str, is_online: bool):
        """Update device online status using SQLAlchemy ORM."""
        session = SessionLocal()
        try:
            device = session.query(Device).filter_by(uid=uid).first()
            if device:
                device.is_online = is_online
                session.commit()
                return True
            else:
                logger.warning(f"Device with UID {uid} not found")
                return False
        except Exception as e:
            logger.error(f"Failed to update device status: {e}")
            session.rollback()
            return False
        finally:
            session.close()

    def ingest(self, topic: str, payload: bytes) -> int:
        """Parse JSON payload and filter by topic suffix.
        
        - Topics ending with '/stat': update device status
        - Topics with '/send/': save to MongoDB
        
        Returns number of documents inserted (0 for status topics).
        """
        try:
            data = json.loads(payload.decode("utf-8"))
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            return 0

        if not isinstance(data, dict):
            logger.warning("Payload is not a JSON object; skipping")
            return 0

        device_id = data.get("device_id")

        # Update device status
        if "/stat/" in topic:
            is_online = True if data.get("status") == "isOnline" else False
            if device_id:
                self.update_device_status(device_id, is_online)
            return 1
        
        # Save device data
        if "/send/" in topic:
            document: Dict[str, Any] = dict(data)
            document["topic"] = topic
            document["timestamp"] = datetime.now(timezone.utc)

            try:
                self.collection.insert_one(document)
                return 1
            except Exception as e:
                logger.error(f"Failed to insert into MongoDB: {e}")
                return 0
        
        return 0

