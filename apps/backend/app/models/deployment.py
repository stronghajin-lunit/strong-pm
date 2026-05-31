from datetime import datetime, timezone

from sqlalchemy import Boolean, DateTime, ForeignKey, PrimaryKeyConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Deployment(Base):
    __tablename__ = "deployments"

    id: Mapped[int] = mapped_column(primary_key=True)
    jira_version_id: Mapped[int] = mapped_column(ForeignKey("jira_versions.id"), nullable=False, index=True)
    stat_total: Mapped[int] = mapped_column(nullable=False)
    stat_with_pr: Mapped[int] = mapped_column(nullable=False)
    stat_no_pr: Mapped[int] = mapped_column(nullable=False)
    stat_merged: Mapped[int] = mapped_column(nullable=False)
    stat_deployed_this: Mapped[int] = mapped_column(nullable=False)
    stat_deployed_prev: Mapped[int] = mapped_column(nullable=False)
    stat_unregistered_prs: Mapped[int] = mapped_column(nullable=False)
    unregistered_breakdown_needed: Mapped[int | None] = mapped_column(nullable=True)
    unregistered_breakdown_not_needed: Mapped[int | None] = mapped_column(nullable=True)
    unregistered_breakdown_no_ticket: Mapped[int | None] = mapped_column(nullable=True)
    run_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


class DeploymentRepo(Base):
    __tablename__ = "deployment_repos"
    __table_args__ = (PrimaryKeyConstraint("deployment_id", "repo_id"),)

    deployment_id: Mapped[int] = mapped_column(ForeignKey("deployments.id"), nullable=False)
    repo_id: Mapped[int] = mapped_column(ForeignKey("repos.id"), nullable=False, index=True)
    version_tag: Mapped[str] = mapped_column(String(50), nullable=False)


class DeploymentTicket(Base):
    __tablename__ = "deployment_tickets"

    id: Mapped[int] = mapped_column(primary_key=True)
    deployment_id: Mapped[int] = mapped_column(ForeignKey("deployments.id"), nullable=False, index=True)
    jira_ticket_id: Mapped[int] = mapped_column(ForeignKey("jira_tickets.id"), nullable=False, index=True)
    pr: Mapped[str | None] = mapped_column(String(50), nullable=True)
    merged: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
