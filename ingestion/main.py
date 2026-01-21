import signal
import sys
from app.core.config import settings
from app.core.mongo import test_mongo_connection
from app.core.mqtt_client import MQTTClient
from app.utils.logger import logger
from app.services.device_pipeline_manager import DevicePipelineManager

# Global MQTT client
mqtt_client = None
pipeline_manager = None


def signal_handler(sig, frame):
    """Handle Ctrl+C for graceful shutdown by stopping MQTT client and pipelines"""
    logger.info("\nShutting down...")
    if pipeline_manager:
        pipeline_manager.stop()
    if mqtt_client:
        mqtt_client.stop()
    sys.exit(0)


def main():
    """Main entry point"""
    global mqtt_client, pipeline_manager

    # Connect to MongoDB
    logger.info("Connecting to MongoDB...")
    if not test_mongo_connection():
        logger.error("Cannot connect to MongoDB. Exiting.")
        sys.exit(1)

    # Show MQTT configuration
    logger.info(f"MQTT Broker: {settings.MQTT_BROKER_HOST}:{settings.MQTT_BROKER_PORT}")
    logger.info(f"Topic for raw device data: {settings.MQTT_DEVICE_RAW_DATA_TOPIC}")
    logger.info(f"Topic for processed device data: {settings.MQTT_DEVICE_PROCESSED_DATA_TOPIC}")
    logger.info(f"Topic for device events: {settings.MQTT_DEVICE_EVENT_TOPIC}")
    logger.info(f"Topic for device status: {settings.MQTT_DEVICE_STATUS_TOPIC}")

    # Initialize MQTT client
    logger.info("Initializing MQTT client...")
    mqtt_client = MQTTClient()

    # Initialize Device Pipeline Manager
    pipeline_manager = DevicePipelineManager(mqtt_client)
    mqtt_client.set_on_connect_handler(pipeline_manager.handle_mqtt_connect)

    # Register signal handler (Assign signal handlers for SIGINT and SIGTERM) 
    # (Ctrl+C) Shutdown
    signal.signal(signal.SIGINT, signal_handler)
    # Process termination Shutdown
    signal.signal(signal.SIGTERM, signal_handler)

    # Connect and start
    logger.info("Starting MQTT client...")
    if mqtt_client.connect():
        logger.info("=" * 60)
        logger.info("Ingestion service started successfully!")
        logger.info("Listening for messages...")
        logger.info("Press Ctrl+C to stop")
        logger.info("=" * 60)
        mqtt_client.start_loop()
        
    else:
        logger.error("Failed to start MQTT client")
        sys.exit(1)


if __name__ == "__main__":
    main()
