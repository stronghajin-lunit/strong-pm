from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.deployment import Deployment, DeploymentRepo, DeploymentTicket


async def create(
    db: AsyncSession,
    jira_version_id: int,
    run_at: object,
    stat_total: int,
    stat_with_pr: int,
    stat_no_pr: int,
    stat_merged: int,
    stat_deployed_this: int,
    stat_deployed_prev: int,
    stat_unregistered_prs: int,
    unregistered_breakdown_needed: int | None,
    unregistered_breakdown_not_needed: int | None,
    unregistered_breakdown_no_ticket: int | None,
) -> Deployment:
    dep = Deployment(
        jira_version_id=jira_version_id,
        run_at=run_at,
        stat_total=stat_total,
        stat_with_pr=stat_with_pr,
        stat_no_pr=stat_no_pr,
        stat_merged=stat_merged,
        stat_deployed_this=stat_deployed_this,
        stat_deployed_prev=stat_deployed_prev,
        stat_unregistered_prs=stat_unregistered_prs,
        unregistered_breakdown_needed=unregistered_breakdown_needed,
        unregistered_breakdown_not_needed=unregistered_breakdown_not_needed,
        unregistered_breakdown_no_ticket=unregistered_breakdown_no_ticket,
    )
    db.add(dep)
    await db.flush()
    return dep


async def add_repos(
    db: AsyncSession,
    deployment_id: int,
    repo_id_tags: list[tuple[int, str]],
) -> None:
    """repo_id_tags: list of (repo_id, version_tag)."""
    if not repo_id_tags:
        return
    rows = [{"deployment_id": deployment_id, "repo_id": rid, "version_tag": tag} for rid, tag in repo_id_tags]
    stmt = pg_insert(DeploymentRepo).values(rows).on_conflict_do_nothing()
    await db.execute(stmt)


async def add_tickets(
    db: AsyncSession,
    deployment_id: int,
    ticket_rows: list[tuple[int, str | None, bool | None, str]],
) -> None:
    """ticket_rows: list of (jira_ticket_db_id, pr, merged, status)."""
    if not ticket_rows:
        return
    for jira_ticket_id, pr, merged, status in ticket_rows:
        dt = DeploymentTicket(
            deployment_id=deployment_id,
            jira_ticket_id=jira_ticket_id,
            pr=pr,
            merged=merged,
            status=status,
        )
        db.add(dt)
    await db.flush()


async def list_all(db: AsyncSession) -> list[Deployment]:
    result = await db.execute(select(Deployment).order_by(Deployment.id.desc()))
    return list(result.scalars().all())


async def get_by_id(db: AsyncSession, deployment_id: int) -> Deployment | None:
    result = await db.execute(select(Deployment).where(Deployment.id == deployment_id))
    return result.scalar_one_or_none()


async def get_tickets(db: AsyncSession, deployment_id: int) -> list[DeploymentTicket]:
    result = await db.execute(
        select(DeploymentTicket).where(DeploymentTicket.deployment_id == deployment_id)
    )
    return list(result.scalars().all())


async def get_repos(db: AsyncSession, deployment_id: int) -> list[DeploymentRepo]:
    result = await db.execute(
        select(DeploymentRepo).where(DeploymentRepo.deployment_id == deployment_id)
    )
    return list(result.scalars().all())
