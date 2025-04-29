from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr
from pydantic_settings import BaseSettings
import motor.motor_asyncio
from typing import List, Optional, Annotated
from dotenv import load_dotenv
import os
import aiohttp
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.api import api_router
from app.db.session import get_db
from app.core.security import get_password_hash
from motor.motor_asyncio import AsyncIOMotorClient
from typing import AsyncGenerator
import logging

load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class Settings(BaseSettings):
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://mongodb:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "kpiusdb")
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key")

settings = Settings()
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Настройки CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[str(origin) for origin in settings.BACKEND_CORS_ORIGINS],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение к MongoDB
client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.AUTH_SERVICE_URL}/token")

class UserProfile(BaseModel):
    username: str
    email: EmailStr
    full_name: str
    role: str
    department: Optional[str] = None
    position: Optional[str] = None

class UserProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None

async def verify_token(token: Annotated[str, Depends(oauth2_scheme)]) -> dict:
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{settings.AUTH_SERVICE_URL}/users/me",
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            if response.status == 401:
                raise HTTPException(
                    status_code=401,
                    detail="Неверный токен"
                )
            return await response.json()

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> dict:
    return await verify_token(token)

@app.get("/users/{username}", response_model=UserProfile)
async def get_user_profile(
    username: str,
    current_user: Annotated[dict, Depends(get_current_user)]
):
    # Проверяем права доступа
    if current_user["role"] not in ["admin", "manager"] and current_user["username"] != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра профиля"
        )
    
    user = await db.user_profiles.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    return UserProfile(**user)

@app.put("/users/{username}", response_model=UserProfile)
async def update_user_profile(
    username: str,
    profile: UserProfileUpdate,
    current_user: Annotated[dict, Depends(get_current_user)]
):
    # Проверяем права доступа
    if current_user["role"] not in ["admin", "manager"] and current_user["username"] != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для обновления профиля"
        )
    
    update_data = {k: v for k, v in profile.dict(exclude_unset=True).items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нет полей для обновления"
        )
    
    result = await db.user_profiles.update_one(
        {"username": username},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    updated_user = await db.user_profiles.find_one({"username": username})
    return UserProfile(**updated_user)

@app.get("/users", response_model=List[UserProfile])
async def list_users(
    current_user: Annotated[dict, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 10
):
    # Проверяем права доступа
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра списка пользователей"
        )
    
    users = await db.user_profiles.find().skip(skip).limit(limit).to_list(length=limit)
    return [UserProfile(**user) for user in users]

# Подключение маршрутов API
app.include_router(api_router, prefix=settings.API_V1_STR)

# Инициализация базы данных
@app.on_event("startup")
async def startup_db_client():
    """Событие при запуске приложения"""
    try:
        # Подключение к MongoDB
        app.mongodb_client = AsyncIOMotorClient(settings.MONGODB_URL)
        app.mongodb = app.mongodb_client[settings.MONGODB_DB]
        logger.info("Подключено к MongoDB")
        
        # Создание индексов для коллекции пользователей
        await app.mongodb.users.create_index("email", unique=True)
        await app.mongodb.users.create_index("username", unique=True)
        
        # Создание администратора, если его нет
        admin = await app.mongodb.users.find_one({"email": settings.FIRST_SUPERUSER})
        if not admin:
            admin_user = {
                "email": settings.FIRST_SUPERUSER,
                "username": "admin",
                "password_hash": get_password_hash(settings.FIRST_SUPERUSER_PASSWORD),
                "full_name": "Administrator",
                "role": "admin",
                "is_active": True
            }
            await app.mongodb.users.insert_one(admin_user)
            logger.info("Создан администратор")
        
        # Миграция существующих пользователей
        await migrate_existing_users()
        
    except Exception as e:
        logger.error(f"Ошибка при подключении к MongoDB: {e}")
        raise

@app.on_event("shutdown")
async def shutdown_db_client():
    """Событие при завершении работы приложения"""
    if hasattr(app, "mongodb_client"):
        app.mongodb_client.close()
        logger.info("Соединение с MongoDB закрыто")

async def migrate_existing_users():
    """Миграция пользователей (добавление полей username если его нет)"""
    try:
        # Ищем пользователей без username
        async for user in app.mongodb.users.find({"username": {"$exists": False}}):
            # Генерируем username из email
            username = user["email"].split("@")[0]
            
            # Проверяем уникальность username
            counter = 1
            base_username = username
            while await app.mongodb.users.find_one({"username": username}):
                username = f"{base_username}{counter}"
                counter += 1
                
            # Обновляем пользователя
            await app.mongodb.users.update_one(
                {"_id": user["_id"]},
                {"$set": {"username": username}}
            )
            logger.info(f"Мигрирован пользователь {user['email']} -> username: {username}")
            
    except Exception as e:
        logger.error(f"Ошибка при миграции пользователей: {e}")

# Зависимость для получения базы данных
async def get_db() -> AsyncGenerator:
    try:
        yield app.mongodb
    except Exception as e:
        logger.error(f"Error getting database: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection error"
        ) 