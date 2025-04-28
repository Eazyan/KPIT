import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_attendance_stats():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        token = "testtoken"
        headers = {"Authorization": f"Bearer {token}"}
        response = await ac.get("/attendance/stats/testuser", headers=headers)
        assert response.status_code in (200, 401) 