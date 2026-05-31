import pytest
from httpx import AsyncClient


class TestHealth:
    """GET /api/v1/health"""

    @pytest.mark.asyncio
    async def test_returns_ok(self, client: AsyncClient) -> None:
        response = await client.get("/api/v1/health")
        assert response.status_code == 200
        assert response.json() == {"status": "ok"}
