from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic_settings import BaseSettings
import aiohttp
from typing import Optional, Dict, Any
from dotenv import load_dotenv
import os
from jose import JWTError, jwt
from fastapi import status
import httpx

load_dotenv()

class Settings(BaseSettings):
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")
    USER_SERVICE_URL: str = os.getenv("USER_SERVICE_URL", "http://user-service:8002")
    ATTENDANCE_SERVICE_URL: str = os.getenv("ATTENDANCE_SERVICE_URL", "http://attendance-service:8003")
    NOTIFICATION_SERVICE_URL: str = os.getenv("NOTIFICATION_SERVICE_URL", "http://notification-service:8004")
    REPORTING_SERVICE_URL: str = os.getenv("REPORTING_SERVICE_URL", "http://reporting-service:8005")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key")
    ALGORITHM: str = "HS256"

settings = Settings()
app = FastAPI(title="API Gateway")

# Настройки CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def verify_token(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

# Класс для запроса аутентификации
class LoginRequest(BaseModel):
    email: str
    password: str

# Аутентификация - оригинальные маршруты v1
@app.post("/api/v1/auth/login")
async def login_v1(request: LoginRequest):
    print(f"API Gateway received login request: {request.email}")
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.AUTH_SERVICE_URL}/api/v1/auth/login", 
            json={"email": request.email, "password": request.password}
        )
        return response.json()

@app.post("/api/v1/auth/register")
async def register_v1(request: Dict[str, Any]):
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{settings.AUTH_SERVICE_URL}/api/v1/auth/register", json=request)
        return response.json()

# Дополнительные маршруты без версии для совместимости с фронтендом
# @app.post("/api/auth/login")
# async def login(request: LoginRequest):
#     print(f"API Gateway received login request via /api/auth/login: {request.email}")
#     async with httpx.AsyncClient() as client:
#         response = await client.post(
#             f"{settings.AUTH_SERVICE_URL}/api/v1/auth/login", 
#             json={"email": request.email, "password": request.password}
#         )
#         return response.json()

# @app.post("/api/auth/register")
# async def register(request: Dict[str, Any]):
#     async with httpx.AsyncClient() as client:
#         response = await client.post(f"{settings.AUTH_SERVICE_URL}/api/v1/auth/register", json=request)
#         return response.json()

# Пользователи
@app.get("/api/v1/users/{username}")
async def get_user(username: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{settings.USER_SERVICE_URL}/api/v1/users/{username}")
        return response.json()

@app.put("/api/v1/users/{username}")
async def update_user(username: str, request: dict):
    async with httpx.AsyncClient() as client:
        response = await client.put(f"{settings.USER_SERVICE_URL}/api/v1/users/{username}", json=request)
        return response.json()

# Посещаемость
@app.post("/api/v1/attendance")
async def record_attendance(request: dict):
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{settings.ATTENDANCE_SERVICE_URL}/api/v1/attendance", json=request)
        return response.json()

@app.get("/api/v1/attendance/{user_id}")
async def get_attendance(user_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{settings.ATTENDANCE_SERVICE_URL}/api/v1/attendance/{user_id}")
        return response.json()

# Уведомления
@app.get("/api/v1/notifications/{user_id}")
async def get_notifications(user_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{settings.NOTIFICATION_SERVICE_URL}/api/v1/notifications/{user_id}")
        return response.json()

@app.put("/api/v1/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str):
    async with httpx.AsyncClient() as client:
        response = await client.put(f"{settings.NOTIFICATION_SERVICE_URL}/api/v1/notifications/{notification_id}/read")
        return response.json()

# Отчеты
@app.post("/api/v1/reports/generate")
async def generate_report(request: dict):
    async with httpx.AsyncClient() as client:
        response = await client.post(f"{settings.REPORTING_SERVICE_URL}/api/v1/reports/generate", json=request)
        return response.json()

@app.get("/api/v1/reports/templates")
async def get_report_templates():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{settings.REPORTING_SERVICE_URL}/api/v1/reports/templates")
        return response.json()

# Health check
@app.get("/health")
async def health_check():
    return {"status": "healthy"} 
