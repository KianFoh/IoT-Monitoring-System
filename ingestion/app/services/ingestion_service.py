import json
from datetime import datetime, timezone
from typing import Any, Dict

from app.core.mongo import get_collection
from app.utils.logger import logger


class IngestionService:
    """Ingest MQTT JSON payloads directly into MongoDB."""

    def __init__(self):
        self.collection = get_collection()

    def ingest(self, topic: str, payload: bytes) -> int:
        """Parse JSON payload and filter by topic suffix.
        
        - Topics ending with '/status': log only
        - Topics ending with '/data': save to MongoDB
        
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

        # Filter by topic suffix
        if topic.endswith("/status"):
            logger.info(f"Status message from {topic}: {data}")
            return 0

        if topic.endswith("/data"):
            # Process /data topics
            document: Dict[str, Any] = dict(data)
            document["topic"] = topic
            document["timestamp"] = datetime.now(timezone.utc)

            try:
                result = self.collection.insert_one(document)
                logger.info(f"Inserted document with id: {result.inserted_id} from topic: {topic}")
                return 1
            except Exception as e:
                logger.error(f"Failed to insert into MongoDB: {e}")
                return 0

