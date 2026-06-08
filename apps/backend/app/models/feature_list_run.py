from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FeatureListRun(Base):
    __tablename__ = "feature_list_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int | None] = mapped_column(
        ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    project_name: Mapped[str] = mapped_column(String(500), nullable=False)
    prd_page_url: Mapped[str] = mapped_column(Text, nullable=False)
    prd_page_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    feature_list_page_url: Mapped[str] = mapped_column(Text, nullable=False)
    feature_list_page_id: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(10), nullable=False, default="running")
    confluence_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    feature_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )
