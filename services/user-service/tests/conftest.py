import os
import sys
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
from app.main import app
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings
import asyncio
import aiohttp
from app.core.security import get_password_hash, create_access_token
from datetime import timedelta

# Добавляем корневую директорию проекта в PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

@pytest.fixture
def event_loop():
    """Создаем event loop для тестов"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
async def test_db():
    """Фикстура для тестовой базы данных"""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.test_db
    # Очищаем коллекции перед тестами
    await db.users.delete_many({})
    
    yield db
    
    # Очищаем коллекции после тестов
    await db.users.delete_many({})
    # Закрываем соединение
    client.close()

@pytest.fixture
def mock_db():
    """Создает мок для базы данных"""
    mock = AsyncMock()
    mock.users = AsyncMock()
    mock.users.find_one = AsyncMock()
    mock.users.insert_one = AsyncMock()
    mock.users.update_one = AsyncMock()
    
    # Правильно мокаем асинхронный итератор
    mock_cursor = AsyncMock()
    mock_cursor.__aiter__.return_value = []
    mock.users.find.return_value = mock_cursor
    
    return mock

@pytest.fixture
def mock_client(mock_db):
    """Создает тестового клиента с моком базы данных"""
    # Патчим функцию get_db для возврата мока
    app.dependency_overrides[get_db] = lambda: mock_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def real_client(test_db):
    """Создает тестового клиента с реальной тестовой базой данных"""
    # Патчим функцию get_db для возврата тестовой БД
    app.dependency_overrides[get_db] = lambda: test_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def client(mock_db):
    """Создает тестового клиента с тестовой базой данных"""
    app.dependency_overrides["db"] = lambda: mock_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
async def test_user(test_db):
    """Создаем тестового пользователя"""
    user = {
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "role": "user",
        "password": "testpass123",
        "password_hash": get_password_hash("testpass123")
    }
    await test_db.user_profiles.insert_one(user)
    yield user
    await test_db.user_profiles.delete_one({"username": user["username"]})

@pytest.fixture
async def auth_token(test_user):
    """Получаем токен аутентификации"""
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": test_user["email"], "role": test_user["role"]},
        expires_delta=access_token_expires
    )
    return access_token

@pytest.fixture(autouse=True)
async def cleanup(test_db):
    """Автоматически очищаем базу данных после каждого теста"""
    yield
    await test_db.users.delete_many({})

@pytest.fixture
async def admin_user(test_db):
    """Создаем тестового администратора"""
    admin = {
        "username": "admin",
        "email": "admin@example.com",
        "full_name": "Admin User",
        "role": "admin",
        "password": "adminpass123",
        "password_hash": get_password_hash("adminpass123")
    }
    await test_db.user_profiles.insert_one(admin)
    yield admin
    await test_db.user_profiles.delete_one({"username": admin["username"]})

@pytest.fixture
async def admin_token(admin_user):
    """Получаем токен аутентификации для администратора"""
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": admin_user["email"], "role": admin_user["role"]},
        expires_delta=access_token_expires
    )
    return access_token 