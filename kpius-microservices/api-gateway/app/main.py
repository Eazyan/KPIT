from fastapi import FastAPI, APIRouter, Request, Response
from fastapi.middleware.cors import CORSMiddleware
import httpx

from app.core.config import get_settings
from app.api.routes.auth import router as auth_router

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    description="API шлюз для микросервисной архитектуры KPiUS",
    version="1.0.0",
    docs_url=f"{settings.API_PREFIX}/docs",
    redoc_url=f"{settings.API_PREFIX}/redoc",
    openapi_url=f"{settings.API_PREFIX}/openapi.json",
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Создание API роутера
api_router = APIRouter(prefix=settings.API_PREFIX)

# Добавление маршрутов сервисов
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])

# Регистрация API роутера
app.include_router(api_router)

# Корневой маршрут
@app.get("/")
async def root():
    return {
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running"
    }

# Маршрут для проверки здоровья
@app.get("/health")
async def health_check():
    """
    Проверка здоровья API Gateway и связанных сервисов
    """
    services_status = {"api_gateway": "healthy"}
    
    # Проверяем доступность сервиса аутентификации
    try:
        async with httpx.AsyncClient() as client:
            auth_response = await client.get(f"{settings.AUTH_SERVICE_URL}/health", timeout=2.0)
            services_status["auth_service"] = "healthy" if auth_response.status_code == 200 else "unhealthy"
    except Exception:
        services_status["auth_service"] = "unavailable"
    
    # Проверяем доступность сервиса посещаемости
    try:
        async with httpx.AsyncClient() as client:
            attendance_response = await client.get(f"{settings.ATTENDANCE_SERVICE_URL}/health", timeout=2.0)
            services_status["attendance_service"] = "healthy" if attendance_response.status_code == 200 else "unhealthy"
    except Exception:
        services_status["attendance_service"] = "unavailable"
    
    # Определяем общий статус
    overall_status = "healthy" if all(status == "healthy" for service, status in services_status.items()) else "degraded"
    
    return {
        "status": overall_status,
        "services": services_status
    }
