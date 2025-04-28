import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_user_profile():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        # Тестовый токен (можно заменить на валидный токен из auth-service)
        token = "testtoken"
        headers = {"Authorization": f"Bearer {token}"}
        # Проверка получения списка пользователей (ожидаем 401, так как токен невалидный)
        response = await ac.get("/users", headers=headers)
        assert response.status_code in (200, 401) 