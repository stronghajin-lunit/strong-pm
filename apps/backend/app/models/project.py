from datetime import UTC, datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Integer, PrimaryKeyConstraint, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="not_started")
    epic_link: Mapped[str | None] = mapped_column(Text, nullable=True)
    epic_key: Mapped[str | None] = mapped_column(String(50), nullable=True)
    confluence_link: Mapped[str | None] = mapped_column(Text, nullable=True)
    confluence_page_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    workflow_step: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    background: Mapped[str | None] = mapped_column(Text, nullable=True)
    hlr: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )


class ProjectProduct(Base):
    """Many-to-many: Project ↔ Product."""

    __tablename__ = "project_products"
    __table_args__ = (PrimaryKeyConstraint("project_id", "product_id"),)

    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    product_id: Mapped[int] = mapped_column(
        ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )


class ProjectContext(Base):
    """One AI-generated context summary per project.

    page_cache stores per-page metadata + content used for change detection and
    re-summarisation without re-fetching unchanged pages:
    {
      "<page_id>": {
        "title": "...",
        "content": "plain text...",
        "updated_at": "ISO-8601"
      }
    }
    """

    __tablename__ = "project_contexts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(
        ForeignKey("projects.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    context: Mapped[str | None] = mapped_column(Text, nullable=True)
    page_cache: Mapped[dict[str, Any]] = mapped_column(
        JSONB, nullable=False, default=dict
    )
    synced_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        onupdate=lambda: datetime.now(UTC),
        nullable=False,
    )
