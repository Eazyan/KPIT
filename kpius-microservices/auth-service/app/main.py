from fastapi import FastAPI, APIRouter
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.api.routes import auth
from app.db.mongodb import connect_to_mongodb, close_mongodb_connection

settings = get_settings()

# Создание приложения FastAPI
app = FastAPI(
    title=settings.APP_NAME,
    description="Сервис аутентификации и авторизации для KPiUS",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В production ограничить до конкретных доменов
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# События при запуске и остановке приложения
@app.on_event("startup")
async def startup_db_client():
    """Выполняется при запуске приложения"""
    await connect_to_mongodb()

@app.on_event("shutdown")
async def shutdown_db_client():
    """Выполняется при остановке приложения"""
    await close_mongodb_connection()

# Роутер API v1
api_router = APIRouter(prefix=settings.API_V1_STR)
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])

# Подключаем роутеры
app.include_router(api_router)

# Корневой эндпоинт
@app.get("/")
async def root():
    return {
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running"
    }

# Эндпоинт проверки работоспособности
@app.get("/health")
async def health_check():
    return {"status": "healthy"} 