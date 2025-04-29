import pytest
from httpx import AsyncClient
from fastapi import FastAPI
from main import app, get_password_hash, verify_password
from models import User, UserInDB
from motor.motor_asyncio import AsyncIOMotorClient
import os

@pytest.fixture
async def test_app():
    """Фикстура для создания тестового приложения"""
    return app

@pytest.fixture
async def test_client(test_app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Фикстура для создания тестового клиента"""
    async with AsyncClient(app=test_app, base_url="http://test") as client:
        yield client

@pytest.mark.asyncio
async def test_password_hashing():
    """Тест хеширования пароля"""
    password = "test_password"
    hashed = get_password_hash(password)
    assert verify_password(password, hashed)
    assert not verify_password("wrong_password", hashed)

@pytest.mark.asyncio
async def test_user_creation(test_client: AsyncClient, clean_db):
    """Тест создания пользователя"""
    user_data = {
        "username": "test_user",
        "email": "test@example.com",
        "password": "test_password",
        "full_name": "Test User"
    }
    
    response = await test_client.post("/register", json=user_data)
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == user_data["email"]
    assert data["username"] == user_data["username"]
    assert "password" not in data

@pytest.mark.asyncio
async def test_login(test_client: AsyncClient, clean_db):
    """Тест входа пользователя"""
    # Сначала создаем пользователя
    user_data = {
        "username": "test_user",
        "email": "test@example.com",
        "password": "test_password",
        "full_name": "Test User"
    }
    await test_client.post("/register", json=user_data)
    
    # Пробуем войти
    login_data = {
        "username": user_data["email"],
        "password": user_data["password"]
    }
    response = await test_client.post("/token", data=login_data)
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_invalid_login(test_client: AsyncClient):
    """Тест входа с неверными данными"""
    login_data = {
        "username": "wrong@example.com",
        "password": "wrong_password"
    }
    response = await test_client.post("/token", data=login_data)
    assert response.status_code == 401 