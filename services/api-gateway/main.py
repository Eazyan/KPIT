from fastapi import FastAPI, HTTPException, Depends, Request
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pydantic_settings import BaseSettings
import aiohttp
from typing import Optional
from dotenv import load_dotenv
import os
from jose import JWTError, jwt
from fastapi import status

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
    allow_origins=["http://localhost:3000"],  # Разрешаем запросы с фронтенда
    allow_credentials=True,
    allow_methods=["*"],  # Разрешаем все методы
    allow_headers=["*"],  # Разрешаем все заголовки
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

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

# Аутентификация
@app.post("/auth/token")
async def login(form_data: OAuth2PasswordRequestForm = Depends()):
    try:
        print(f"API Gateway: Received login request for email: {form_data.username}")
        async with aiohttp.ClientSession() as session:
            data = {
                "username": form_data.username,
                "password": form_data.password
            }
            print(f"API Gateway: Sending request to auth service at {settings.AUTH_SERVICE_URL}/token")
            async with session.post(
                f"{settings.AUTH_SERVICE_URL}/token",
                data=data
            ) as response:
                print(f"API Gateway: Received response with status {response.status}")
                if response.status == 422:
                    error_text = await response.text()
                    print(f"API Gateway: Validation error: {error_text}")
                    raise HTTPException(
                        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                        detail="Email и пароль обязательны"
                    )
                if response.status == 401:
                    error_text = await response.text()
                    print(f"API Gateway: Authentication error: {error_text}")
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Неверный email или пароль"
                    )
                if response.status == 500:
                    error_text = await response.text()
                    print(f"API Gateway: Server error: {error_text}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Ошибка сервера: {error_text}"
                    )
                response_data = await response.json()
                print(f"API Gateway: Response data from auth service: {response_data}")
                print("API Gateway: Login successful")
                
                # Декодируем токен для получения роли
                try:
                    token_payload = jwt.decode(
                        response_data.get("access_token"),
                        settings.JWT_SECRET,
                        algorithms=[settings.ALGORITHM]
                    )
                    user_role = token_payload.get("role", "student")
                except Exception as e:
                    print(f"API Gateway: Error decoding token: {str(e)}")
                    user_role = "student"
                
                # Преобразуем ответ в формат, ожидаемый фронтендом
                return {
                    "token": response_data.get("access_token"),
                    "token_type": response_data.get("token_type"),
                    "user": {
                        "email": form_data.username,
                        "role": user_role
                    }
                }
    except aiohttp.ClientError as e:
        print(f"API Gateway: Connection error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при подключении к сервису аутентификации: {str(e)}"
        )
    except Exception as e:
        print(f"API Gateway: Unexpected error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Неожиданная ошибка: {str(e)}"
        )

@app.post("/auth/register")
async def register(user_data: dict):
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{settings.AUTH_SERVICE_URL}/register",
            json=user_data
        ) as response:
            return await response.json()

# Пользователи
@app.get("/users/{username}")
async def get_user(username: str, token: str = Depends(verify_token)):
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{settings.USER_SERVICE_URL}/users/{username}",
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            return await response.json()

@app.put("/users/{username}")
async def update_user(username: str, user_data: dict, token: str = Depends(verify_token)):
    async with aiohttp.ClientSession() as session:
        async with session.put(
            f"{settings.USER_SERVICE_URL}/users/{username}",
            json=user_data,
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            return await response.json()

# Посещаемость
@app.post("/attendance")
async def record_attendance(attendance_data: dict, token: str = Depends(verify_token)):
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{settings.ATTENDANCE_SERVICE_URL}/attendance",
            json=attendance_data,
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            return await response.json()

@app.get("/attendance/{user_id}")
async def get_attendance(user_id: str, token: str = Depends(verify_token)):
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{settings.ATTENDANCE_SERVICE_URL}/attendance/{user_id}",
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            return await response.json()

# Уведомления
@app.get("/notifications/{user_id}")
async def get_notifications(user_id: str, token: str = Depends(verify_token)):
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{settings.NOTIFICATION_SERVICE_URL}/notifications/{user_id}",
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            return await response.json()

@app.put("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, token: str = Depends(verify_token)):
    async with aiohttp.ClientSession() as session:
        async with session.put(
            f"{settings.NOTIFICATION_SERVICE_URL}/notifications/{notification_id}/read",
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            return await response.json()

# Отчеты
@app.post("/reports/generate")
async def generate_report(report_data: dict, token: str = Depends(verify_token)):
    async with aiohttp.ClientSession() as session:
        async with session.post(
            f"{settings.REPORTING_SERVICE_URL}/reports/generate",
            json=report_data,
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            return await response.json()

@app.get("/reports/templates")
async def get_report_templates(token: str = Depends(verify_token)):
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{settings.REPORTING_SERVICE_URL}/reports/templates",
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            return await response.json() 