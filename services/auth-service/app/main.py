from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.v1.endpoints import auth
from app.db.mongodb import MongoDB
import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.security import get_password_hash

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json"
)

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix=settings.API_V1_STR, tags=["auth"]) 

@app.on_event("startup")
async def startup_db_client():
    await MongoDB.connect_to_mongo()
    logger.info("Connected to MongoDB.")

    # Создаем тестового пользователя, если его нет
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    
    # Проверяем, есть ли пользователь с email student@dvfu.ru
    user = await db["users"].find_one({"email": "student@dvfu.ru"})
    if not user:
        logger.info("Creating test user...")
        # Создаем тестового пользователя
        from datetime import datetime, timezone
        
        user_data = {
            "email": "student@dvfu.ru",
            "full_name": "Test Student",
            "is_active": True,
            "is_superuser": False,
            "hashed_password": get_password_hash("student123"),
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db["users"].insert_one(user_data)
        logger.info(f"Test user created: {user_data}")
    else:
        logger.info(f"Test user already exists: {user}")

    client.close()

@app.on_event("shutdown")
async def shutdown_db_client():
    await MongoDB.close_mongo_connection()
    logger.info("MongoDB connection closed.")

@app.get("/")
async def root():
    return {"message": "Auth Service API"}

@app.get("/health")
async def health_check():
    try:
        db = await MongoDB.get_db().__anext__()
        await db.command('ping')
        return {"status": "healthy"}
    except Exception as e:
        return {"status": "unhealthy", "error": str(e)}