from typing import Any, Dict, List, Optional, Union
from pydantic import AnyHttpUrl
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "User Service"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Настройки MongoDB
    MONGODB_URL: str = "mongodb://mongodb:27017"
    MONGODB_DB: str = "kpiusdb"
    
    # Настройки JWT
    SECRET_KEY: str = "your-secret-key-here"  # В продакшене заменить на безопасный ключ
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Настройки первого суперпользователя
    FIRST_SUPERUSER: str = "admin@example.com"
    FIRST_SUPERUSER_PASSWORD: str = "admin123"
    
    # Настройки CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = ["http://localhost:3000"]

    class Config:
        case_sensitive = True
        env_file = ".env"

settings = Settings() 