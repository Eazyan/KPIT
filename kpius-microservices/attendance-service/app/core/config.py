from pydantic import BaseModel
from functools import lru_cache
import os
from typing import Optional


class Settings(BaseModel):
    app_name: str = "Attendance Service"
    mongodb_uri: str = "mongodb://mongodb:27017"
    database_name: str = "attendance_db"
    auth_service_url: str = "http://auth-service:5000"
    service_port: int = 5002
    
    class Config:
        env_file = ".env"


@lru_cache()
def get_settings():
    return Settings(
        mongodb_uri=os.environ.get("MONGODB_URI", "mongodb://mongodb:27017"),
        database_name=os.environ.get("DATABASE_NAME", "attendance_db"),
        auth_service_url=os.environ.get("AUTH_SERVICE_URL", "http://auth-service:5000"),
        service_port=int(os.environ.get("SERVICE_PORT", "5002"))
    ) 