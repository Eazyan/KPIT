from pydantic import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    """
    Настройки приложения, загружаемые из переменных окружения
    """
    # Основные настройки приложения
    APP_NAME: str = "KPiUS-Auth-Service"
    API_V1_STR: str = "/api/v1"
    API_PREFIX: str = "/api"
    
    # Настройки базы данных
    MONGODB_URL: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "kpiusdb"
    
    # Настройки JWT
    JWT_SECRET: str = "your-secret-key"  # В реальном проекте использовать надежный ключ и хранить в переменных окружения
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    ALGORITHM: str = "HS256"
    
    # Настройки RabbitMQ
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672/"
    
    # Настройки сервера
    HOST: str = "0.0.0.0"
    PORT: int = 5001
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    """
    Получение настроек приложения с кешированием
    """
    return Settings() 