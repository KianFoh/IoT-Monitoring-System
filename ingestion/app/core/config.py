from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # App
    PROJECT_NAME: str

    # PostgreSQL
    DB_DRIVER: str
    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str
    
    # MongoDB
    MONGO_HOST: str
    MONGO_PORT: int
    MONGO_USER: str
    MONGO_PASSWORD: str
    MONGO_DB_NAME: str
    MONGO_COLLECTION: str
    MONGO_LATEST_COLLECTION: str
    MONGO_AUTH_SOURCE: str

    # MQTT
    MQTT_BROKER_HOST: str
    MQTT_BROKER_PORT: int
    MQTT_USERNAME: str
    MQTT_PASSWORD: str
    MONGO_AUTH_SOURCE: str = "admin"
    # Maximum period in seconds between communications with the broker before the broker considers the client disconnected
    MQTT_KEEPALIVE: int = 60
    MQTT_DEVICE_RAW_DATA_TOPIC: str = "{customer_name}/json/send/{device_uid}/"
    MQTT_DEVICE_PROCESSED_DATA_TOPIC: str = "internal/devices/processed/{customer_name}/{department_name}/{device_uid}/"
    MQTT_DEVICE_EVENT_TOPIC: str = "internal/devices/events/{customer_name}/{department_name}/{device_uid}/"
    MQTT_DEVICE_STATUS_TOPIC: str = "internal/devices/status/{customer_name}/{department_name}/{device_uid}/"

    # Monitoring / logging
    LOG_LEVEL: str = "INFO"

    # Setup env file path
    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[3] / ".env",
        extra="ignore",
    )

settings = Settings()
