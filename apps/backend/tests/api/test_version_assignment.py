from datetime import UTC, datetime

import pytest
from httpx import AsyncClient

from app.integrations import jira as jira_integration
from app.integrations.jira import JiraVersionData
from app.services import version_assignment_service

_SYNCED_AT = datetime(2026, 4, 1, tzinfo=UTC)
_TODAY = datetime(2026, 8, 25, tzinfo=UTC)


class _FixedDatetime(datetime):
    @classmethod
    def now(cls, tz=None):
        return _TODAY.astimezone(tz) if tz else _TODAY


@pytest.fixture(autouse=True)
def freeze_today(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(version_assignment_service, "datetime", _FixedDatetime)


def _stub_versions(monkeypatch: pytest.MonkeyPatch, versions: list[JiraVersionData]) -> None:
    async def _fetch_project_versions(project_key: str) -> list[JiraVersionData]:
        return list(versions)

    monkeypatch.setattr(jira_integration, "fetch_project_versions", _fetch_project_versions)


class TestListVersionAssignmentVersions:
    """GET /api/v1/version-assignment/versions - List Fix Versions for assignment

    Requirements:
    ============
    1. Purpose - Offer the RAD project's Fix Versions as assignment targets
    2. Response - up to 8 versions, most relevant to today first (releaseDate desc)
    3. Business rule - versions are picked by proximity to today's date, not plain
       recency, so versions planned far in the future don't crowd out the version
       that is actually closest to release
    """

    @pytest.mark.asyncio
    async def test_picks_versions_closest_to_today_over_future_placeholders(
        self, client: AsyncClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Current version survives the cap despite many future placeholders
        Given: today's version plus 8 future-dated placeholder versions
        When: GET /api/v1/version-assignment/versions
        Then: 200, today's version is included in the 8 returned
        """
        # Given
        current = JiraVersionData(
            "current", "AICP Monthly 26-08-25", _SYNCED_AT, release_date="2026-08-25"
        )
        future_placeholders = [
            JiraVersionData(
                f"future-{i}", f"AICP Monthly future {i}", _SYNCED_AT,
                release_date=f"{2027 + i}-01-25",
            )
            for i in range(8)
        ]
        _stub_versions(monkeypatch, [current, *future_placeholders])

        # When
        response = await client.get("/api/v1/version-assignment/versions")

        # Then
        assert response.status_code == 200
        ids = [v["id"] for v in response.json()["versions"]]
        assert "current" in ids
        assert len(ids) == 8

    @pytest.mark.asyncio
    async def test_returns_at_most_eight_sorted_by_date_desc(
        self, client: AsyncClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Selected versions are displayed most-recent-first
        Given: ten versions with distinct releaseDates around today
        When: GET /api/v1/version-assignment/versions
        Then: 200, at most 8 versions, each strictly newer than the next
        """
        # Given
        versions = [
            JiraVersionData(
                f"v{i}", f"AICP Monthly v{i}", _SYNCED_AT, release_date=f"2026-{i:02d}-01"
            )
            for i in range(1, 11)
        ]
        _stub_versions(monkeypatch, versions)

        # When
        response = await client.get("/api/v1/version-assignment/versions")

        # Then
        assert response.status_code == 200
        dates = [v["release_date"] for v in response.json()["versions"]]
        assert len(dates) == 8
        assert dates == sorted(dates, reverse=True)

    @pytest.mark.asyncio
    async def test_parses_date_from_name_when_release_date_missing(
        self, client: AsyncClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Falls back to the YY-MM-DD suffix in the version name
        Given: a version with no releaseDate but a dated name
        When: GET /api/v1/version-assignment/versions
        Then: 200, the version is returned (parsed as close to today)
        """
        # Given
        versions = [
            JiraVersionData("aicp-0825", "AICP Monthly 26-08-25", _SYNCED_AT, release_date=None),
        ]
        _stub_versions(monkeypatch, versions)

        # When
        response = await client.get("/api/v1/version-assignment/versions")

        # Then
        assert response.status_code == 200
        ids = [v["id"] for v in response.json()["versions"]]
        assert ids == ["aicp-0825"]

    @pytest.mark.asyncio
    async def test_undated_versions_rank_below_dated_ones(
        self, client: AsyncClient, monkeypatch: pytest.MonkeyPatch
    ) -> None:
        """Versions with no resolvable date are deprioritized, not excluded
        Given: one dated version and one undated version, cap large enough for both
        When: GET /api/v1/version-assignment/versions
        Then: 200, both are present, undated version sorted last
        """
        # Given
        versions = [
            JiraVersionData("undated", "AICP Ongoing", _SYNCED_AT, release_date=None),
            JiraVersionData(
                "dated", "AICP Monthly 26-08-25", _SYNCED_AT, release_date="2026-08-25"
            ),
        ]
        _stub_versions(monkeypatch, versions)

        # When
        response = await client.get("/api/v1/version-assignment/versions")

        # Then
        assert response.status_code == 200
        ids = [v["id"] for v in response.json()["versions"]]
        assert ids == ["dated", "undated"]
