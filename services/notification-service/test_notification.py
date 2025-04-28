import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_get_notifications():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/notifications/testuser")
        assert response.status_code in (200, 404) 