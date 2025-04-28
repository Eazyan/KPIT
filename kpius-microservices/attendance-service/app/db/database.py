import motor.motor_asyncio
from ..core.config import get_settings
import logging

logger = logging.getLogger(__name__)
settings = get_settings()

# Глобальные переменные для клиента и базы данных
client = None
db = None

async def connect_to_mongo():
    """Установка соединения с MongoDB."""
    global client, db
    try:
        client = motor.motor_asyncio.AsyncIOMotorClient(settings.mongodb_uri)
        db = client[settings.database_name]
        logger.info(f"Подключено к MongoDB: {settings.mongodb_uri}, БД: {settings.database_name}")
        # Проверка соединения
        await client.admin.command('ping')
        return db
    except Exception as e:
        logger.error(f"Ошибка подключения к MongoDB: {e}")
        raise e

async def close_mongo_connection():
    """Закрытие соединения с MongoDB."""
    global client
    if client:
        client.close()
        logger.info("Соединение с MongoDB закрыто")

def get_database():
    """Получение объекта базы данных."""
    if db is None:
        raise Exception("База данных не инициализирована")
    return db 