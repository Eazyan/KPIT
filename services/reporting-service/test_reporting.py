import pytest
from httpx import AsyncClient
from main import app

@pytest.mark.asyncio
async def test_get_report_templates():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        response = await ac.get("/reports/templates")
        assert response.status_code == 200 