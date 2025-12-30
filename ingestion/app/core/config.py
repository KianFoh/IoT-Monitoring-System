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
    MONGO_AUTH_SOURCE: str

    # MQTT
    MQTT_BROKER_HOST: str
    MQTT_BROKER_PORT: int
    MQTT_USERNAME: str
    MQTT_PASSWORD: str
    MONGO_AUTH_SOURCE: str = "admin"
    MQTT_KEEPALIVE: int = 60
    MQTT_TOPIC_PATTERN: str = "#"

    # Monitoring / logging
    LOG_LEVEL: str = "INFO"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[3] / ".env",
        extra="ignore",
    )


settings = Settings()
