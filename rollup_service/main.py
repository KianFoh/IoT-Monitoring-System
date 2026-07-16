import signal
import sys

from app.core.config import settings
from app.core.mongo import ensure_indexes, test_mongo_connection
from app.core.mqtt_client import MQTTClient
from app.services.rollup_service import RollupService
from app.utils.logger import logger


mqtt_client = None
rollup_service = None


def signal_handler(_sig, _frame):
    logger.info("Shutting down rollup service...")
    if mqtt_client:
        mqtt_client.stop()
    sys.exit(0)


def main():
    global mqtt_client, rollup_service

    logger.info("Connecting to MongoDB...")
    if not test_mongo_connection():
        logger.error("Cannot connect to MongoDB. Exiting.")
        sys.exit(1)
    ensure_indexes()

    logger.info("MQTT broker: %s:%s", settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT)
    logger.info("Processed topic: %s", settings.MQTT_DEVICE_PROCESSED_TOPIC)
    logger.info("Device event topic: %s", settings.MQTT_DEVICE_EVENT_TOPIC)

    mqtt_client = MQTTClient()
    rollup_service = RollupService(mqtt_client)
    mqtt_client.set_on_connect_handler(rollup_service.handle_mqtt_connect)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    logger.info("Starting MQTT client...")
    if mqtt_client.connect():
        logger.info("Rollup service started")
        mqtt_client.start_loop()
        return

    logger.error("Failed to start rollup service")
    sys.exit(1)


if __name__ == "__main__":
    main()
