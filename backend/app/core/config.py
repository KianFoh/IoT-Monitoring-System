import os
from functools import lru_cache
from pydantic_settings import BaseSettings
from pydantic import Field
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    # ==================== Application ====================
    PROJECT_NAME: str = Field(default="project-name")
    FRONTEND_URL: str = Field(default="http://localhost:3000")

    # ==================== PostgreSQL ====================
    DB_DRIVER: str = Field(default="postgresql")
    DB_HOST: str = Field(default="localhost")
    DB_PORT: str = Field(default="5432")
    DB_NAME: str = Field(default="iot_db")
    DB_USER: str = Field(default="postgres")
    DB_PASSWORD: str = Field(default="postgres")

    # ==================== MongoDB ====================
    MONGO_HOST: str = Field(default="localhost")
    MONGO_PORT: str = Field(default="27017")
    MONGO_DB_NAME: str = Field(default="iot_monitoring")
    MONGO_USER: str = Field(default=None)
    MONGO_PASSWORD: str = Field(default=None)
    MONGO_AUTH_SOURCE: str = Field(default=None)
    DEVICES_DATA_COLLECTION_NAME: str = Field(default="devices_data")

    # ==================== MQTT ====================
    MQTT_BROKER_HOST: str = Field(default="localhost")
    MQTT_BROKER_PORT: int = Field(default=1883)
    MQTT_USERNAME: str = Field(default=None)
    MQTT_PASSWORD: str = Field(default=None)
    MQTT_KEEPALIVE: int = Field(default=60)

    # ==================== JWT Security ====================
    JWT_SECRET_KEY: str = Field(default="JWT_SECRET_KEY")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=30)
    REFRESH_TOKEN_EXPIRE_DAYS: int = Field(default=7)
    
	# ==================== Email Token ====================
    EMAIL_TOKEN_EXPIRE_HOURS: int = Field(default=24)

    # ==================== CORS ====================
    ALLOWED_ORIGINS: str = Field(default="http://localhost:3000,http://localhost:3001")

    # ==================== Server ====================
    FASTAPI_PORT: int = Field(default=8000)
    ENVIRONMENT: str = Field(default="development")
    DEBUG: bool = True if os.getenv("ENVIRONMENT", "development") == "development" else False
    
	# ====================== MQTT Password Encryption ====================
    MQTT_ENCRYPTION_KEY: str = Field(default="mqtt-encryption-key")

	# ==================== SMTP Configuration ====================
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.example.com")
    SMTP_PORT: str = os.getenv("SMTP_PORT", "587")
    SMTP_USER: str = os.getenv("SMTP_USER", "email")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "password")

    @property
    def database_url(self) -> str:
        """Compose database URL"""
        auth = f"{self.DB_USER}:{self.DB_PASSWORD}@"
        port = f":{self.DB_PORT}"
        return f"{self.DB_DRIVER}://{auth}{self.DB_HOST}{port}/{self.DB_NAME}"

    @property
    def mongo_uri_computed(self) -> str:
        return f"mongodb://{self.MONGO_USER}:{self.MONGO_PASSWORD}@{self.MONGO_HOST}:{self.MONGO_PORT}/?authSource={self.MONGO_AUTH_SOURCE}"

    @property
    def allowed_origins_list(self) -> list[str]:
        """Return CORS origins as list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance"""
    return Settings()

_settings = get_settings()
