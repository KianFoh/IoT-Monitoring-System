from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    PROJECT_NAME: str = "IoT Rollup Service"

    DB_HOST: str
    DB_PORT: int
    DB_NAME: str
    DB_USER: str
    DB_PASSWORD: str

    MONGO_HOST: str
    MONGO_PORT: int
    MONGO_USER: str
    MONGO_PASSWORD: str
    MONGO_DB_NAME: str
    MONGO_COLLECTION: str
    MONGO_LATEST_COLLECTION: str
    MONGO_ROLLUP_HOUR_COLLECTION: str
    MONGO_ROLLUP_MIN_COLLECTION: str
    MONGO_AUTH_SOURCE: str = "admin"

    MQTT_BROKER_HOST: str
    MQTT_BROKER_PORT: int
    MQTT_USERNAME: str = ""
    MQTT_PASSWORD: str = ""
    MQTT_KEEPALIVE: int = 60
    MQTT_DEVICE_PROCESSED_TOPIC: str = "internal/devices/processed/#"
    MQTT_DEVICE_EVENT_TOPIC: str = "internal/devices/events/#"

    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[3] / ".env",
        extra="ignore",
    )


settings = Settings()
