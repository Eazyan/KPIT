import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch, MagicMock
import sys
import os

# Добавляем корневую директорию проекта в PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.main import app
from app.core.security import verify_password, get_password_hash

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

def test_login_success(client):
    # Настраиваем мок для успешного логина
    test_user = {
        "email": "test@example.com",
        "password_hash": get_password_hash("testpassword"),
        "username": "testuser",
        "role": "user",
        "disabled": False
    }
    
    client.app.dependency_overrides['db'] = lambda: AsyncMock(
        users=AsyncMock(
            find_one=AsyncMock(return_value=test_user)
        )
    )
    
    response = client.post("/token", data={
        "username": "test@example.com",
        "password": "testpassword"
    })
    
    assert response.status_code == 200
    assert "access_token" in response.json()
    assert "refresh_token" in response.json()
    assert response.json()["token_type"] == "bearer"

def test_login_invalid_credentials(client):
    # Настраиваем мок для неудачного логина
    client.app.dependency_overrides['db'] = lambda: AsyncMock(
        users=AsyncMock(
            find_one=AsyncMock(return_value=None)
        )
    )
    
    response = client.post("/token", data={
        "username": "wrong@example.com",
        "password": "wrongpassword"
    })
    
    assert response.status_code == 401
    assert "Неверный email или пароль" in response.json()["detail"]

def test_register_success(client):
    # Настраиваем мок для успешной регистрации
    client.app.dependency_overrides['db'] = lambda: AsyncMock(
        users=AsyncMock(
            find_one=AsyncMock(return_value=None),
            insert_one=AsyncMock(return_value=AsyncMock(inserted_id="123"))
        )
    )
    
    response = client.post(
        "/register?password=testpassword123",
        json={
            "username": "newuser",
            "email": "new@example.com",
            "full_name": "New User"
        }
    )
    
    assert response.status_code == 200
    assert response.json()["email"] == "new@example.com"
    assert response.json()["username"] == "newuser"

def test_register_existing_user(client):
    # Настраиваем мок для существующего пользователя
    existing_user = {
        "email": "existing@example.com",
        "username": "existinguser",
        "password_hash": get_password_hash("testpassword123"),
        "role": "user",
        "disabled": False
    }
    
    client.app.dependency_overrides['db'] = lambda: AsyncMock(
        users=AsyncMock(
            find_one=AsyncMock(return_value=existing_user)
        )
    )
    
    response = client.post(
        "/register?password=testpassword123",
        json={
            "username": "existinguser",
            "email": "existing@example.com",
            "full_name": "Existing User"
        }
    )
    
    assert response.status_code == 400
    assert "Пользователь уже существует" in response.json()["detail"] 