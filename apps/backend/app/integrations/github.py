from dataclasses import dataclass


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


async def fetch_deployment_data(
    jira_version_id: str,
    ticket_ids: list[str],
) -> GithubDeploymentResult:
    """Mock: cross-validates Jira tickets with GitHub PR deployment status."""
    _repo_map: dict[str, list[str]] = {
        "aicp-0401": [
            "scope-dp-console (v4.8.0)",
            "scope-annotation-tool-front (v4.7.0)",
        ],
        "odm-0401": [
            "scope-odm-backend (v2.3.1)",
        ],
        "aicp-0301": [
            "scope-dp-console (v4.7.0)",
        ],
    }

    _status_map: dict[str, tuple[str | None, bool | None, str]] = {
        "RAD-9372": (None, None, "no_pr"),
        "RAD-9362": (None, None, "no_pr"),
        "RAD-9100": ("#1801", True, "deployed_this"),
        "RAD-9241": ("#1790", True, "unregistered"),
        "RAD-9242": ("#1792", True, "unregistered"),
        "RAD-9300": ("#1805", True, "deployed_this"),
        "ODM-1001": ("#301", True, "deployed_this"),
        "ODM-1002": ("#302", True, "deployed_this"),
        "ODM-1003": (None, None, "no_pr"),
        "RAD-8900": ("#1750", True, "deployed_this"),
        "RAD-8901": ("#1751", True, "deployed_this"),
        "RAD-8902": ("#1752", True, "deployed_prev"),
    }

    rows: list[GithubTicketRow] = []
    no_pr: list[str] = []
    unregistered: list[str] = []

    for tid in ticket_ids:
        pr, merged, status = _status_map.get(tid, (None, None, "no_pr"))
        rows.append(GithubTicketRow(ticket_id=tid, pr=pr, merged=merged, status=status))
        if status == "no_pr":
            no_pr.append(tid)
        elif status == "unregistered":
            unregistered.append(tid)

    return GithubDeploymentResult(
        repos=_repo_map.get(jira_version_id, ["unknown-repo (v0.0.0)"]),
        no_pr_tickets=no_pr,
        unregistered_pr_tickets=unregistered,
        unregistered_breakdown_needed=len(unregistered) - 1 if len(unregistered) > 1 else None,
        unregistered_breakdown_not_needed=1 if len(unregistered) > 1 else None,
        unregistered_breakdown_no_ticket=1 if len(unregistered) > 0 else None,
        ticket_rows=rows,
    )
