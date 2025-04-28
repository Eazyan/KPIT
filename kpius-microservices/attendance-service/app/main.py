from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
import logging

from .core.config import get_settings
from .db.database import connect_to_mongo, close_mongo_connection

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Инициализация приложения
settings = get_settings()
app = FastAPI(
    title=settings.app_name,
    description="API сервиса управления посещаемостью",
    version="0.1.0",
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# События запуска и завершения приложения
@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()
    logger.info("Подключение к MongoDB установлено")

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()
    logger.info("Подключение к MongoDB закрыто")

# Базовый маршрут для проверки работоспособности
@app.get("/health")
async def health_check():
    return {"status": "ok", "service": settings.app_name}

# Подключение маршрутов API
# from .api.routes import groups, students, attendance

# app.include_router(groups.router, prefix="/api/groups", tags=["groups"])
# app.include_router(students.router, prefix="/api/students", tags=["students"])
# app.include_router(attendance.router, prefix="/api/attendance", tags=["attendance"]) 