import pytest
from httpx import AsyncClient
from main import app

import asyncio

@pytest.mark.asyncio
async def test_register_and_login():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Регистрация
        response = await ac.post("/register", json={
            "username": "testuser",
            "email": "test@example.com",
            "full_name": "Test User"
        }, params={"password": "testpass123"})
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"

        # Логин
        response = await ac.post("/token", data={
            "username": "testuser",
            "password": "testpass123"
        })
        assert response.status_code == 200
        token_data = response.json()
        assert "access_token" in token_data
        assert token_data["token_type"] == "bearer"

        # Получение профиля
        headers = {"Authorization": f"Bearer {token_data['access_token']}"}
        response = await ac.get("/users/me", headers=headers)
        assert response.status_code == 200
        user_data = response.json()
        assert user_data["username"] == "testuser" 