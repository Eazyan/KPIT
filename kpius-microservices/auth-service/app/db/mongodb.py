import motor.motor_asyncio
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import get_settings

settings = get_settings()

# Клиент MongoDB
client: AsyncIOMotorClient = None

async def get_database() -> AsyncIOMotorDatabase:
    """
    Получение объекта базы данных
    """
    return client[settings.DATABASE_NAME]

async def connect_to_mongodb():
    """
    Подключение к MongoDB
    """
    global client
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    
    # Создание индексов для коллекции пользователей при запуске
    db = client[settings.DATABASE_NAME]
    
    # Индексы
    # Уникальный индекс по email в коллекции пользователей
    await db.users.create_index("email", unique=True)
    
    # Индекс по роли пользователя для быстрого поиска
    await db.users.create_index("role")
    
    # Проверяем существование ролей и создаем базовые, если их нет
    roles_count = await db.roles.count_documents({})
    if roles_count == 0:
        await db.roles.insert_many([
            {"name": "admin", "permissions": ["read", "write", "delete", "admin"]},
            {"name": "teacher", "permissions": ["read", "write"]},
            {"name": "student", "permissions": ["read"]}
        ])
    
    print(f"Connected to MongoDB at {settings.MONGODB_URL}")

async def close_mongodb_connection():
    """
    Закрытие соединения с MongoDB
    """
    global client
    if client:
        client.close()
        client = None
        print("Disconnected from MongoDB")

async def create_indexes():
    """
    Создание индексов для коллекций базы данных
    """
    db = await get_database()
    
    # Уникальный индекс по email в коллекции пользователей
    await db.users.create_index("email", unique=True)
    
    # Индекс по роли пользователя для быстрого поиска
    await db.users.create_index("role") 