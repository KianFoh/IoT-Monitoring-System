import signal
import sys
from app.core.config import settings
from app.core.mongo import test_mongo_connection
from app.core.mqtt_client import MQTTClient
from app.handlers.message_handler import MessageHandler
from app.utils.logger import logger

# Global MQTT client
mqtt_client = None


def signal_handler(sig, frame):
    """Handle Ctrl+C for graceful shutdown"""
    logger.info("\nShutting down...")
    if mqtt_client:
        mqtt_client.stop()
    sys.exit(0)


def main():
    """Main entry point"""
    global mqtt_client

    # 1. Test MongoDB connection
    logger.info("Testing MongoDB connection...")
    if not test_mongo_connection():
        logger.error("Cannot connect to MongoDB. Exiting.")
        sys.exit(1)

    # 2. Show MQTT configuration
    logger.info(f"MQTT Broker: {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}")
    logger.info(f"Topic Pattern: {settings.MQTT_TOPIC_PATTERN}")

    # 3. Initialize message handler
    logger.info("Initializing message handler...")
    message_handler = MessageHandler()

    # 4. Initialize MQTT client
    logger.info("Initializing MQTT client...")
    mqtt_client = MQTTClient()
    mqtt_client.set_message_handler(message_handler.handle_message)

    # 5. Register signal handler (Ctrl+C)
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # 6. Connect dan start
    logger.info("Starting MQTT client...")
    if mqtt_client.connect():
        logger.info("=" * 60)
        logger.info("Ingestion service started successfully!")
        logger.info("Listening for messages...")
        logger.info("   Press Ctrl+C to stop")
        logger.info("=" * 60)
        mqtt_client.start_loop()
    else:
        logger.error("Failed to start MQTT client")
        sys.exit(1)


if __name__ == "__main__":
    main()
