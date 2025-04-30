import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock, patch
from main import app, get_db
from app.core.security import get_password_hash, create_access_token
from datetime import timedelta
from app.core.config import settings
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.auth import (
    register_user,
    authenticate_user,
    create_access_token,
    get_current_user
)

@pytest.fixture
async def test_db():
    """Фикстура для тестовой базы данных"""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    db = client.test_db
    await db.users.delete_many({})
    yield db
    await db.users.delete_many({})
    client.close()

@pytest.fixture
def mock_db():
    """Создает мок для базы данных для тестирования"""
    mock = AsyncMock()
    mock.users = AsyncMock()
    mock.users.find_one = AsyncMock()
    mock.users.insert_one = AsyncMock()
    mock.users.delete_one = AsyncMock()
    mock.users.update_one = AsyncMock()
    
    # Правильно мокаем асинхронный итератор
    mock_cursor = AsyncMock()
    mock_cursor.__aiter__.return_value = []
    mock.users.find.return_value = mock_cursor
    
    return mock

@pytest.fixture
def client(mock_db):
    """Создает тестового клиента с мок базой данных"""
    # Патчим функцию get_db для возврата мока
    app.dependency_overrides[get_db] = lambda: mock_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def test_user():
    return {
        "email": "test@example.com",
        "username": "testuser",
        "password": "testpass123",
        "password_hash": get_password_hash("testpass123"),
        "role": "user"
    }

@pytest.fixture
def auth_token(test_user):
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    return create_access_token(
        data={"sub": test_user["email"], "role": test_user["role"]},
        expires_delta=access_token_expires
    )

@pytest.mark.asyncio
async def test_login_success(client, test_user, mock_db):
    """Тест успешного входа пользователя"""
    # Настраиваем мок для успешного входа
    mock_db.users.find_one.return_value = test_user
    
    response = client.post(
        "/auth/login",
        data={
            "username": test_user["email"],
            "password": "testpass123"
        }
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["email"] == test_user["email"]
    assert data["username"] == test_user["username"]

@pytest.mark.asyncio
async def test_login_invalid_credentials(client, mock_db):
    """Тест входа с неверными учетными данными"""
    # Настраиваем мок для неудачного входа
    mock_db.users.find_one.return_value = None
    
    response = client.post(
        "/auth/login",
        data={
            "username": "wrong@example.com",
            "password": "wrongpassword"
        }
    )
    
    assert response.status_code == 401
    assert "Неверный email или пароль" in response.json()["detail"]

@pytest.mark.asyncio
async def test_register_success(client, mock_db):
    """Тест успешной регистрации пользователя"""
    # Настраиваем мок для успешной регистрации
    mock_db.users.find_one.return_value = None
    
    # Подготавливаем результат вставки
    inserted_id = "generated_id_12345"
    mock_db.users.insert_one.return_value = AsyncMock(inserted_id=inserted_id)
    
    new_user = {
        "email": "newuser@example.com",
        "username": "newuser",
        "password": "newpass123",
        "full_name": "New User",
        "role": "user"
    }
    
    response = client.post(
        "/auth/register",
        json=new_user
    )
    
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == new_user["email"]
    assert data["username"] == new_user["username"]
    
    # Проверяем, что метод insert_one был вызван
    mock_db.users.insert_one.assert_called_once()

@pytest.mark.asyncio
async def test_register_existing_user(client, test_user, mock_db):
    """Тест регистрации с существующим email"""
    # Настраиваем мок для существующего пользователя
    mock_db.users.find_one.return_value = test_user
    
    response = client.post(
        "/auth/register",
        json={
            "email": test_user["email"],
            "username": "differentuser",
            "password": "newpass123",
            "full_name": "Different User",
            "role": "user"
        }
    )
    
    assert response.status_code == 400
    assert "Пользователь с таким email уже существует" in response.json()["detail"]

@pytest.mark.asyncio
async def test_get_current_user(client, test_user, mock_db, auth_token):
    """Тест получения данных текущего пользователя"""
    # Настраиваем мок для поиска пользователя
    mock_db.users.find_one.return_value = test_user
    
    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user["email"]
    assert data["username"] == test_user["username"]

@pytest.mark.asyncio
async def test_get_current_user_unauthorized(client):
    """Тест получения данных текущего пользователя без токена"""
    response = client.get("/auth/me")
    
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]

@pytest.mark.asyncio
async def test_refresh_token(client, test_user, mock_db, auth_token):
    """Тест обновления токена"""
    # Настраиваем мок для поиска пользователя
    mock_db.users.find_one.return_value = test_user
    
    response = client.post(
        "/auth/refresh",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["access_token"] != auth_token

@pytest.mark.asyncio
async def test_logout(client, test_user, auth_token):
    """Тест выхода из системы"""
    response = client.post(
        "/auth/logout",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    
    assert response.status_code == 200
    
    # Проверяем, что токен больше не работает
    response = client.get(
        "/auth/me",
        headers={"Authorization": f"Bearer {auth_token}"}
    )
    assert response.status_code == 401

@pytest.mark.asyncio
async def test_register_user(test_db):
    """Тест регистрации пользователя"""
    user_data = {
        "email": "test@example.com",
        "password": "testpassword",
        "full_name": "Test User"
    }
    
    # Регистрируем пользователя
    user = await register_user(test_db, user_data)
    
    # Проверяем, что пользователь создан
    assert user is not None
    assert user["email"] == user_data["email"]
    assert user["full_name"] == user_data["full_name"]
    assert "hashed_password" in user
    assert "id" in user

@pytest.mark.asyncio
async def test_authenticate_user(test_db):
    """Тест аутентификации пользователя"""
    # Сначала регистрируем пользователя
    user_data = {
        "email": "test@example.com",
        "password": "testpassword",
        "full_name": "Test User"
    }
    await register_user(test_db, user_data)
    
    # Пытаемся аутентифицироваться
    user = await authenticate_user(test_db, user_data["email"], user_data["password"])
    
    # Проверяем результат
    assert user is not None
    assert user["email"] == user_data["email"]
    
    # Проверяем неверный пароль
    user = await authenticate_user(test_db, user_data["email"], "wrongpassword")
    assert user is None

@pytest.mark.asyncio
async def test_create_access_token(test_db):
    """Тест создания токена доступа"""
    # Создаем тестового пользователя
    user_data = {
        "email": "test@example.com",
        "password": "testpassword",
        "full_name": "Test User"
    }
    user = await register_user(test_db, user_data)
    
    # Создаем токен
    token = await create_access_token(test_db, user)
    
    # Проверяем токен
    assert token is not None
    assert "access_token" in token
    assert "token_type" in token
    assert token["token_type"] == "bearer"

@pytest.mark.asyncio
async def test_get_current_user(test_db):
    """Тест получения текущего пользователя"""
    # Создаем тестового пользователя
    user_data = {
        "email": "test@example.com",
        "password": "testpassword",
        "full_name": "Test User"
    }
    user = await register_user(test_db, user_data)
    
    # Создаем токен
    token = await create_access_token(test_db, user)
    
    # Получаем текущего пользователя
    current_user = await get_current_user(test_db, token["access_token"])
    
    # Проверяем результат
    assert current_user is not None
    assert current_user["email"] == user_data["email"]
    assert current_user["full_name"] == user_data["full_name"] 