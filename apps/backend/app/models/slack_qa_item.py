from datetime import UTC, datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class SlackQaItem(Base):
    __tablename__ = "slack_qa_items"
    __table_args__ = (UniqueConstraint("slack_message_ts", name="uq_slack_qa_message_ts"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slack_channel_id: Mapped[str] = mapped_column(String(50), nullable=False)
    slack_channel_name: Mapped[str] = mapped_column(String(200), nullable=False)
    slack_message_ts: Mapped[str] = mapped_column(String(50), nullable=False)
    slack_message_url: Mapped[str] = mapped_column(Text, nullable=False)
    sender_name: Mapped[str] = mapped_column(String(200), nullable=False)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    answer_date: Mapped[str] = mapped_column(String(20), nullable=False)
    ai_project_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    linked_project_id: Mapped[int | None] = mapped_column(
        Integer, ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    archived: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
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
