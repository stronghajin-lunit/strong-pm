import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import httpx

from app.core.config import settings

_GITHUB_API = "https://api.github.com"
_TICKET_PATTERN = re.compile(r"\b([A-Z]+-\d+)\b")


@dataclass
class GithubTicketRow:
    ticket_id: str
    pr: str | None
    merged: bool | None
    status: str


@dataclass
class GithubDeploymentResult:
    repos: list[str]
    no_pr_tickets: list[str]
    unregistered_pr_tickets: list[str]
    unregistered_breakdown_needed: int | None
    unregistered_breakdown_not_needed: int | None
    unregistered_breakdown_no_ticket: int | None
    ticket_rows: list[GithubTicketRow]


def _headers() -> dict[str, str]:
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    if settings.GITHUB_TOKEN:
        headers["Authorization"] = f"Bearer {settings.GITHUB_TOKEN}"
    return headers


def _parse_gh_dt(dt_str: str | None) -> datetime | None:
    if not dt_str:
        return None
    return datetime.fromisoformat(dt_str.replace("Z", "+00:00"))


async def _fetch_prs(client: httpx.AsyncClient, repo: str) -> list[dict]:
    """Fetch up to 200 most-recent PRs (2 pages × 100) from a repo."""
    prs: list[dict] = []
    for page in (1, 2):
        resp = await client.get(
            f"{_GITHUB_API}/repos/{repo}/pulls",
            params={"state": "all", "per_page": 100, "page": page},
            headers=_headers(),
            timeout=20,
        )
        if resp.status_code == 404:
            break
        resp.raise_for_status()
        batch = resp.json()
        prs.extend(batch)
        if len(batch) < 100:
            break
    return prs


async def _fetch_release_window(
    client: httpx.AsyncClient,
    repo: str,
    version_date: datetime | None,
) -> tuple[str | None, datetime | None]:
    """
    Returns (current_release_tag, prev_release_published_at).

    Finds the GitHub release that corresponds to this Jira version:
      - The latest release published on or before version_date + 1 day.
    Then finds the release just before it (skipping same-day releases
    that are part of the same deployment batch) as the prev cutoff.

    deployed_this : merged_at > prev_release_published_at
    deployed_prev : merged_at <= prev_release_published_at
    """
    resp = await client.get(
        f"{_GITHUB_API}/repos/{repo}/releases",
        params={"per_page": 10},
        headers=_headers(),
        timeout=10,
    )
    if resp.status_code == 404:
        return None, None
    resp.raise_for_status()

    releases = [
        r for r in resp.json()
        if not r.get("draft") and not r.get("prerelease") and r.get("published_at")
    ]
    if not releases:
        return None, None

    # Sort ascending by published_at
    releases.sort(key=lambda r: r["published_at"])

    if not version_date:
        # No Jira release date: latest = current, second-latest = prev
        current_tag = releases[-1].get("tag_name")
        prev_date = _parse_gh_dt(releases[-2]["published_at"]) if len(releases) > 1 else None
        return current_tag, prev_date

    # Find the latest release published on or before version_date + 1 day
    # (+1 day buffer absorbs timezone differences between Jira date and GitHub timestamp)
    upper_bound = version_date + timedelta(days=1)
    candidates = [r for r in releases if _parse_gh_dt(r["published_at"]) <= upper_bound]

    if not candidates:
        # All releases are after the version date — use the latest for display, no prev cutoff
        return releases[-1].get("tag_name"), None

    current = candidates[-1]
    current_tag = current.get("tag_name")
    current_dt = _parse_gh_dt(current["published_at"])

    # Skip releases in the same deployment batch (within 24 h of current)
    # so hotfix/patch releases on the same day don't become the "prev" cutoff.
    batch_boundary = current_dt - timedelta(hours=24)  # type: ignore[operator]
    before_batch = [r for r in releases if _parse_gh_dt(r["published_at"]) < batch_boundary]
    prev_date = _parse_gh_dt(before_batch[-1]["published_at"]) if before_batch else None

    return current_tag, prev_date


def _extract_tickets(text: str) -> set[str]:
    return set(_TICKET_PATTERN.findall(text or ""))


def _classify_merge(
    merged_at: datetime | None,
    prev_date: datetime | None,
) -> str:
    """
    deployed_this  — PR merged after the previous release (first included in this release)
    deployed_prev  — PR merged at or before the previous release (already shipped earlier)
    unregistered   — PR exists but not yet merged
    """
    if merged_at is None:
        return "unregistered"
    if prev_date and merged_at <= prev_date:
        return "deployed_prev"
    return "deployed_this"


async def fetch_deployment_data(
    jira_version_id: str,
    ticket_ids: list[str],
    version_date: datetime | None = None,
) -> GithubDeploymentResult:
    """
    Cross-validate Jira tickets with GitHub PRs across all configured repos.

    For each ticket in the Jira version:
      - no_pr        : no PR found referencing this ticket
      - deployed_this: PR first included in this release (merged after prev release)
      - deployed_prev: PR already shipped in an earlier release
      - unregistered : PR found but not yet merged

    Additionally collects merged PRs whose referenced tickets are NOT in the Jira version.
    """
    if not settings.GITHUB_TOKEN:
        raise ValueError("GITHUB_TOKEN is not configured")

    ticket_set = set(ticket_ids)
    repos = [r.strip() for r in settings.GITHUB_REPOS.split(",") if r.strip()]

    # ticket_id → (pr_number_str, merged_at, repo_short)
    # When multiple PRs reference the same ticket, prefer the merged one.
    ticket_to_pr: dict[str, tuple[str, datetime | None, str]] = {}

    # repo_short → (display_tag, prev_cutoff_date)
    repo_release: dict[str, tuple[str | None, datetime | None]] = {}

    # merged PRs that reference no Jira ticket at all
    no_ticket_pr_count = 0

    async with httpx.AsyncClient() as client:
        for repo in repos:
            repo_short = repo.split("/")[-1]
            tag, prev_date = await _fetch_release_window(client, repo, version_date)
            repo_release[repo_short] = (tag, prev_date)

            prs = await _fetch_prs(client, repo)
            for pr in prs:
                merged_at = _parse_gh_dt(pr.get("merged_at"))
                text = f"{pr.get('title', '')} {pr.get('body', '') or ''}"
                found_tickets = _extract_tickets(text)
                pr_num = f"#{pr['number']}"

                if not found_tickets:
                    if merged_at is not None:
                        no_ticket_pr_count += 1
                    continue

                for tid in found_tickets:
                    existing = ticket_to_pr.get(tid)
                    # Prefer merged PR over open PR for the same ticket
                    if existing is None or (merged_at is not None and existing[1] is None):
                        ticket_to_pr[tid] = (pr_num, merged_at, repo_short)

    # Build result rows for tickets in the Jira version
    rows: list[GithubTicketRow] = []
    no_pr: list[str] = []

    for tid in ticket_ids:
        if tid not in ticket_to_pr:
            rows.append(GithubTicketRow(ticket_id=tid, pr=None, merged=None, status="no_pr"))
            no_pr.append(tid)
        else:
            pr_num, merged_at, repo_short = ticket_to_pr[tid]
            _, prev_date = repo_release.get(repo_short, (None, None))
            status = _classify_merge(merged_at, prev_date)
            rows.append(GithubTicketRow(
                ticket_id=tid,
                pr=pr_num,
                merged=(merged_at is not None),
                status=status,
            ))

    # Tickets referenced in merged PRs that are NOT in the Jira version
    unregistered_tickets: list[str] = [
        tid
        for tid, (_, merged_at, _) in ticket_to_pr.items()
        if tid not in ticket_set and merged_at is not None
    ]

    # Active repos: repos where at least one version ticket had a PR
    active_repos: list[str] = []
    seen_repos: set[str] = set()
    for tid in ticket_ids:
        if tid in ticket_to_pr:
            _, _, repo_short = ticket_to_pr[tid]
            if repo_short not in seen_repos:
                seen_repos.add(repo_short)
                tag, _ = repo_release.get(repo_short, (None, None))
                active_repos.append(f"{repo_short} ({tag})" if tag else repo_short)

    n_unregistered = len(unregistered_tickets)
    return GithubDeploymentResult(
        repos=active_repos if active_repos else (
            [f"{repos[0].split('/')[-1]} (unknown)"] if repos else ["unknown"]
        ),
        no_pr_tickets=no_pr,
        unregistered_pr_tickets=unregistered_tickets,
        unregistered_breakdown_needed=n_unregistered if n_unregistered > 0 else None,
        unregistered_breakdown_not_needed=None,
        unregistered_breakdown_no_ticket=no_ticket_pr_count if no_ticket_pr_count > 0 else None,
        ticket_rows=rows,
    )
