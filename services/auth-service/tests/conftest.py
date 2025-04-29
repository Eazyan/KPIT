import pytest
import sys
import os
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch
from main import app
import motor.motor_asyncio
from main import settings

# Добавляем корневую директорию проекта в PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.security import get_password_hash

@pytest.fixture
def client():
    # Мокаем базу данных
    with patch('app.main.db') as mock_db:
        mock_db.users = AsyncMock()
        mock_db.users.find_one = AsyncMock(return_value=None)
        mock_db.users.insert_one = AsyncMock()
        
        # Правильно мокаем асинхронный итератор для миграции пользователей
        mock_cursor = AsyncMock()
        # Создаем пустой асинхронный итератор
        mock_cursor.__aiter__.return_value = AsyncMock(__anext__=AsyncMock(side_effect=StopAsyncIteration()))
        mock_db.users.find.return_value = mock_cursor
        
        # Отключаем стартовые события на время тестов
        with patch('app.main.migrate_existing_users', AsyncMock(return_value=None)):
            # Создаем тестового клиента
            with TestClient(app) as test_client:
                yield test_client

@pytest.fixture
async def test_db():
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
    db = client[settings.DATABASE_NAME]
    yield db
    await client.drop_database(settings.DATABASE_NAME)
    client.close()

@pytest.fixture
def test_user():
    return {
        "username": "testuser",
        "email": "test@example.com",
        "password": "testpassword123",
        "full_name": "Test User"
    } 