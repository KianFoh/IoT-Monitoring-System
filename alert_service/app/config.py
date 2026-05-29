from pathlib import Path

from dotenv import load_dotenv
from pydantic import Field
from pydantic_settings import BaseSettings


ROOT_ENV = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(ROOT_ENV)


class Settings(BaseSettings):
    DB_DRIVER: str = Field(default="postgresql")
    DB_HOST: str = Field(default="localhost")
    DB_PORT: int = Field(default=5432)
    DB_NAME: str = Field(default="iot_db")
    DB_USER: str = Field(default="postgres")
    DB_PASSWORD: str = Field(default="postgres")

    MQTT_BROKER_HOST: str = Field(default="localhost")
    MQTT_BROKER_PORT: int = Field(default=1883)
    MQTT_USERNAME: str | None = Field(default=None)
    MQTT_PASSWORD: str | None = Field(default=None)
    MQTT_KEEPALIVE: int = Field(default=60)

    PROJECT_NAME: str = Field(default="IoT System")
    SMTP_HOST: str = Field(default="smtp.example.com")
    SMTP_PORT: int = Field(default=587)
    SMTP_USER: str = Field(default="email")
    SMTP_PASSWORD: str = Field(default="password")
    SMTP_TIMEOUT: int = Field(default=10)

    ALERT_PROCESSED_TOPIC: str = Field(default="internal/devices/processed/#")
    ALERT_RULE_TOPIC: str = Field(default="internal/devices/alert/#")
    ALERT_WORKERS: int = Field(default=4)
    LOG_LEVEL: str = Field(default="INFO")

    @property
    def database_url(self) -> str:
        auth = f"{self.DB_USER}:{self.DB_PASSWORD}@"
        return f"{self.DB_DRIVER}://{auth}{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    class Config:
        env_file = str(ROOT_ENV)
        extra = "ignore"


settings = Settings()
