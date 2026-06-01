from datetime import datetime, timezone

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud import deployment as deployment_crud
from app.crud import jira_ticket as jira_ticket_crud
from app.crud import jira_version as jira_version_crud
from app.crud import repo as repo_crud
from app.integrations import jira
from app.integrations.github import fetch_deployment_data
from app.models.jira_ticket import JiraTicket
from app.models.repo import Repo
from app.schemas.deployment import (
    DeploymentDetailResponse,
    DeploymentListResponse,
    DeploymentStats,
    DeploymentSummary,
    TicketRow,
    UnregisteredBreakdown,
)
from app.utils import fmt_dt_required, make_dt_id, parse_dt_id


def _parse_repo_name(repo_with_tag: str) -> tuple[str, str]:
    """'scope-dp-console (v4.8.0)' → ('scope-dp-console', 'v4.8.0')"""
    if " (" in repo_with_tag and repo_with_tag.endswith(")"):
        name, tag = repo_with_tag.rsplit(" (", 1)
        return name.strip(), tag.rstrip(")")
    return repo_with_tag, "unknown"


async def run(db: AsyncSession, jira_version_id: str) -> DeploymentDetailResponse:
    raw_versions = await jira.fetch_fix_versions()
    version_data = next((v for v in raw_versions if v.jira_id == jira_version_id), None)
    if version_data is None:
        raise HTTPException(status_code=404, detail={"code": "JIRA_VERSION_NOT_FOUND"})

    raw_tickets = await jira.fetch_tickets_by_version(jira_version_id)
    if raw_tickets is None:
        raise HTTPException(status_code=404, detail={"code": "JIRA_VERSION_NOT_FOUND"})

    ticket_id_map = await jira_ticket_crud.upsert_many(
        db, [(t.ticket_id, t.title) for t in raw_tickets]
    )
    versions = await jira_version_crud.upsert_many(
        db, [(version_data.jira_id, version_data.label, version_data.synced_at)]
    )
    version_record = versions[0]

    github_result = await fetch_deployment_data(jira_version_id, list(ticket_id_map.keys()))

    repo_names = [_parse_repo_name(r)[0] for r in github_result.repos]
    repo_id_map = await repo_crud.upsert_many(db, repo_names)
    repo_id_tags = [
        (repo_id_map[_parse_repo_name(r)[0]], _parse_repo_name(r)[1])
        for r in github_result.repos
    ]

    rows = github_result.ticket_rows
    stat_total = len(rows)
    stat_no_pr = sum(1 for r in rows if r.status == "no_pr")
    stat_with_pr = stat_total - stat_no_pr
    stat_merged = sum(1 for r in rows if r.merged)
    stat_deployed_this = sum(1 for r in rows if r.status == "deployed_this")
    stat_deployed_prev = sum(1 for r in rows if r.status == "deployed_prev")
    stat_unregistered = sum(1 for r in rows if r.status == "unregistered")

    dep = await deployment_crud.create(
        db,
        jira_version_id=version_record.id,
        run_at=datetime.now(timezone.utc),
        stat_total=stat_total,
        stat_with_pr=stat_with_pr,
        stat_no_pr=stat_no_pr,
        stat_merged=stat_merged,
        stat_deployed_this=stat_deployed_this,
        stat_deployed_prev=stat_deployed_prev,
        stat_unregistered_prs=stat_unregistered,
        unregistered_breakdown_needed=github_result.unregistered_breakdown_needed,
        unregistered_breakdown_not_needed=github_result.unregistered_breakdown_not_needed,
        unregistered_breakdown_no_ticket=github_result.unregistered_breakdown_no_ticket,
    )
    await deployment_crud.add_repos(db, dep.id, repo_id_tags)

    ticket_rows_for_db = [
        (ticket_id_map[r.ticket_id], r.pr, r.merged, r.status)
        for r in rows
        if r.ticket_id in ticket_id_map
    ]
    await deployment_crud.add_tickets(db, dep.id, ticket_rows_for_db)
    await db.commit()

    ticket_title_map = {t.ticket_id: t.title for t in raw_tickets}
    breakdown = None
    if any(
        x is not None
        for x in [
            github_result.unregistered_breakdown_needed,
            github_result.unregistered_breakdown_not_needed,
            github_result.unregistered_breakdown_no_ticket,
        ]
    ):
        breakdown = UnregisteredBreakdown(
            needed=github_result.unregistered_breakdown_needed or 0,
            not_needed=github_result.unregistered_breakdown_not_needed or 0,
            no_ticket=github_result.unregistered_breakdown_no_ticket or 0,
        )

    return DeploymentDetailResponse(
        id=make_dt_id(dep.id),
        version=version_record.label,
        run_at=fmt_dt_required(dep.run_at),
        stats=DeploymentStats(
            total=stat_total,
            with_pr=stat_with_pr,
            no_pr=stat_no_pr,
            merged=stat_merged,
            deployed_this=stat_deployed_this,
            deployed_prev=stat_deployed_prev,
            unregistered_prs=stat_unregistered,
        ),
        repos=github_result.repos,
        no_pr_tickets=github_result.no_pr_tickets,
        unregistered_pr_tickets=github_result.unregistered_pr_tickets,
        unregistered_pr_breakdown=breakdown,
        ticket_rows=[
            TicketRow(
                id=r.ticket_id,
                title=ticket_title_map.get(r.ticket_id, ""),
                pr=r.pr,
                merged=r.merged,
                status=r.status,
            )
            for r in rows
        ],
    )


async def list_deployments(db: AsyncSession) -> DeploymentListResponse:
    deps = await deployment_crud.list_all(db)
    result = []
    for dep in deps:
        version = await jira_version_crud.get_by_id(db, dep.jira_version_id)
        if version:
            result.append(
                DeploymentSummary(
                    id=make_dt_id(dep.id),
                    version=version.label,
                    run_at=fmt_dt_required(dep.run_at),
                    total=dep.stat_total,
                    deployed_this=dep.stat_deployed_this,
                    no_pr=dep.stat_no_pr,
                    unregistered_prs=dep.stat_unregistered_prs,
                )
            )
    return DeploymentListResponse(deployments=result)


async def get_detail(db: AsyncSession, dt_id: str) -> DeploymentDetailResponse:
    try:
        dep_db_id = parse_dt_id(dt_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})

    dep = await deployment_crud.get_by_id(db, dep_db_id)
    if dep is None:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND"})

    version = await jira_version_crud.get_by_id(db, dep.jira_version_id)
    dep_tickets = await deployment_crud.get_tickets(db, dep.id)
    dep_repos = await deployment_crud.get_repos(db, dep.id)

    jira_ticket_db_ids = [dt.jira_ticket_id for dt in dep_tickets]
    ticket_records: dict[int, JiraTicket] = {}
    if jira_ticket_db_ids:
        res = await db.execute(select(JiraTicket).where(JiraTicket.id.in_(jira_ticket_db_ids)))
        for t in res.scalars().all():
            ticket_records[t.id] = t

    repo_db_ids = [dr.repo_id for dr in dep_repos]
    repo_records: dict[int, Repo] = {}
    if repo_db_ids:
        repo_res = await db.execute(select(Repo).where(Repo.id.in_(repo_db_ids)))
        for r in repo_res.scalars().all():
            repo_records[r.id] = r

    repo_strings = [
        f"{repo_records[dr.repo_id].name} ({dr.version_tag})"
        for dr in dep_repos
        if dr.repo_id in repo_records
    ]

    no_pr_tickets = [
        ticket_records[dt.jira_ticket_id].ticket_id
        for dt in dep_tickets
        if dt.status == "no_pr" and dt.jira_ticket_id in ticket_records
    ]
    unregistered_tickets = [
        ticket_records[dt.jira_ticket_id].ticket_id
        for dt in dep_tickets
        if dt.status == "unregistered" and dt.jira_ticket_id in ticket_records
    ]

    breakdown = None
    if any(
        x is not None
        for x in [
            dep.unregistered_breakdown_needed,
            dep.unregistered_breakdown_not_needed,
            dep.unregistered_breakdown_no_ticket,
        ]
    ):
        breakdown = UnregisteredBreakdown(
            needed=dep.unregistered_breakdown_needed or 0,
            not_needed=dep.unregistered_breakdown_not_needed or 0,
            no_ticket=dep.unregistered_breakdown_no_ticket or 0,
        )

    return DeploymentDetailResponse(
        id=dt_id,
        version=version.label if version else "",
        run_at=fmt_dt_required(dep.run_at),
        stats=DeploymentStats(
            total=dep.stat_total,
            with_pr=dep.stat_with_pr,
            no_pr=dep.stat_no_pr,
            merged=dep.stat_merged,
            deployed_this=dep.stat_deployed_this,
            deployed_prev=dep.stat_deployed_prev,
            unregistered_prs=dep.stat_unregistered_prs,
        ),
        repos=repo_strings,
        no_pr_tickets=no_pr_tickets,
        unregistered_pr_tickets=unregistered_tickets,
        unregistered_pr_breakdown=breakdown,
        ticket_rows=[
            TicketRow(
                id=ticket_records[dt.jira_ticket_id].ticket_id if dt.jira_ticket_id in ticket_records else "",
                title=ticket_records[dt.jira_ticket_id].title if dt.jira_ticket_id in ticket_records else "",
                pr=dt.pr,
                merged=dt.merged,
                status=dt.status,
            )
            for dt in dep_tickets
        ],
    )
