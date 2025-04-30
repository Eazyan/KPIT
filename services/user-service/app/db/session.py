from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from typing import AsyncGenerator
from app.core.config import settings
import logging

# Настройка логирования
logger = logging.getLogger(__name__)

async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    """
    Возвращает соединение с базой данных MongoDB.
    Является зависимостью для эндпоинтов.
    """
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    try:
        db = client[settings.MONGODB_DB]
        yield db
    except Exception as e:
        logger.error(f"Ошибка подключения к MongoDB: {e}")
        raise
    finally:
        client.close() 