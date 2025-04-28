from pydantic import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    """
    Настройки API Gateway
    """
    # Основные настройки
    APP_NAME: str = "KPiUS-API-Gateway"
    API_PREFIX: str = "/api"
    
    # Настройки сервера
    HOST: str = "0.0.0.0"
    PORT: int = 6000
    
    # URL сервисов
    AUTH_SERVICE_URL: str = "http://auth-service:5000"
    ATTENDANCE_SERVICE_URL: str = "http://attendance-service:5002"
    
    # Настройки CORS
    CORS_ORIGINS: list = ["*"]
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True

@lru_cache()
def get_settings() -> Settings:
    """
    Получение настроек с кэшированием
    """
    return Settings() 