import pytest
import asyncio
from typing import AsyncGenerator
from httpx import AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

@pytest.fixture(scope="session")
def event_loop():
    """Создание event loop для асинхронных тестов"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="session")
async def mongodb_client() -> AsyncGenerator[AsyncIOMotorClient, None]:
    """Фикстура для подключения к тестовой MongoDB"""
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://mongodb:27017"))
    yield client
    await client.close()

@pytest.fixture(scope="session")
async def test_db(mongodb_client: AsyncIOMotorClient):
    """Фикстура для работы с тестовой базой данных"""
    db_name = f"test_{os.getenv('DATABASE_NAME', 'kpiusdb')}"
    db = mongodb_client[db_name]
    yield db
    await db.client.drop_database(db_name)

@pytest.fixture(scope="function")
async def clean_db(test_db):
    """Фикстура для очистки базы данных перед каждым тестом"""
    collections = await test_db.list_collection_names()
    for collection in collections:
        await test_db[collection].delete_many({})
    yield test_db

@pytest.fixture(scope="session")
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Фикстура для создания асинхронного HTTP клиента"""
    async with AsyncClient() as client:
        yield client 