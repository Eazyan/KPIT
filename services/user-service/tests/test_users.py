import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
import aiohttp
import asyncio
from main import app
from app.core.config import settings

@pytest.fixture(scope="session")
def event_loop():
    """Создаем event loop для тестов"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture
def mock_db():
    """Создает мок для базы данных"""
    mock = AsyncMock()
    mock.user_profiles = AsyncMock()
    mock.user_profiles.find_one = AsyncMock()
    mock.user_profiles.update_one = AsyncMock()
    mock.user_profiles.insert_one = AsyncMock()
    mock.user_profiles.delete_one = AsyncMock()
    
    # Правильно мокаем асинхронный итератор
    mock_cursor = AsyncMock()
    mock_cursor.__aiter__.return_value = []
    mock.user_profiles.find.return_value = mock_cursor
    
    return mock

@pytest.fixture
def mock_aiohttp_session():
    """Создает мок для aiohttp.ClientSession"""
    mock_session = AsyncMock()
    mock_response = AsyncMock()
    mock_response.json.return_value = {"access_token": "test_token"}
    mock_response.status = 200
    mock_session.post.return_value.__aenter__.return_value = mock_response
    
    # Создаем контекстный менеджер, который возвращает наш мок
    with patch('aiohttp.ClientSession', return_value=mock_session):
        yield mock_session

@pytest.fixture
def client(mock_db):
    """Создает тестового клиента с моком базы данных"""
    # Подменяем зависимость базы данных
    app.dependency_overrides["db"] = lambda: mock_db
    
    with TestClient(app) as test_client:
        yield test_client
    
    # Очищаем переопределения после тестов
    app.dependency_overrides.clear()

@pytest.fixture
def test_user():
    """Создаем тестовые данные пользователя"""
    return {
        "username": "testuser",
        "email": "test@example.com",
        "full_name": "Test User",
        "role": "user"
    }

@pytest.fixture
def auth_token():
    """Возвращает тестовый токен аутентификации"""
    return "test_auth_token"

def test_get_user_profile_unauthorized(client):
    """Тест получения профиля без токена"""
    response = client.get("/users/me")
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_user_profile_success(client, test_user, auth_token, mock_db):
    """Тест успешного получения профиля пользователя"""
    # Настраиваем мок базы данных для возврата тестового пользователя
    mock_db.user_profiles.find_one.return_value = test_user
    
    response = client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response.status_code == 200
    assert response.json()["username"] == test_user["username"]
    assert response.json()["email"] == test_user["email"]
    
    # Проверяем, что find_one был вызван с правильными параметрами
    mock_db.user_profiles.find_one.assert_called_once()

@pytest.mark.asyncio
async def test_update_user_profile_unauthorized(client):
    """Тест обновления профиля без токена"""
    response = client.put(
        "/users/me",
        json={
            "full_name": "Updated Name",
            "email": "updated@example.com"
        }
    )
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]

@pytest.mark.asyncio
async def test_update_user_profile_success(client, test_user, auth_token, mock_db):
    """Тест успешного обновления профиля пользователя"""
    # Настраиваем моки
    mock_db.user_profiles.find_one.return_value = test_user
    mock_db.user_profiles.update_one.return_value = AsyncMock(modified_count=1)
    
    # Создаем данные для обновления
    update_data = {
        "full_name": "Updated Name",
        "email": "updated@example.com"
    }
    
    # Подготавливаем обновленный результат
    updated_user = test_user.copy()
    updated_user.update(update_data)
    mock_db.user_profiles.find_one.side_effect = [test_user, updated_user]
    
    response = client.put(
        "/users/me",
        headers={"Authorization": f"Bearer {auth_token}"},
        json=update_data
    )
    
    assert response.status_code == 200
    assert response.json()["full_name"] == update_data["full_name"]
    assert response.json()["email"] == update_data["email"]
    
    # Проверяем, что update_one был вызван с правильными параметрами
    mock_db.user_profiles.update_one.assert_called_once()