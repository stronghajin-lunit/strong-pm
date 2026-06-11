import json
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FeatureListApplyLog(Base):
    __tablename__ = "feature_list_apply_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    feature_list_run_id: Mapped[int | None] = mapped_column(
        ForeignKey("feature_list_runs.id", ondelete="SET NULL"), nullable=True, index=True
    )
    feature_list_page_url: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    applied_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    changes_applied: Mapped[int] = mapped_column(Integer, nullable=False)
    comments_resolved: Mapped[int] = mapped_column(Integer, nullable=False)
    confluence_url: Mapped[str] = mapped_column(Text, nullable=False)
    change_details: Mapped[str] = mapped_column(Text, nullable=False)  # JSON string
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(UTC), nullable=False
    )

    def parsed_change_details(self) -> list[dict]:
        return json.loads(self.change_details)
