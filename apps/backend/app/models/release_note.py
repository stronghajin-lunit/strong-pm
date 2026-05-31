from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, PrimaryKeyConstraint, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ReleaseNote(Base):
    __tablename__ = "release_notes"

    id: Mapped[int] = mapped_column(primary_key=True)
    jira_version_id: Mapped[int] = mapped_column(ForeignKey("jira_versions.id"), nullable=False, index=True)
    confluence_page: Mapped[str] = mapped_column(String(20), nullable=False)
    confluence_location: Mapped[str] = mapped_column(String(500), nullable=False)
    confluence_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(10), nullable=False)
    reflection: Mapped[str | None] = mapped_column(Text, nullable=True)
    requested_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
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


class ReleaseNoteTicket(Base):
    __tablename__ = "release_note_tickets"
    __table_args__ = (PrimaryKeyConstraint("release_note_id", "jira_ticket_id"),)

    release_note_id: Mapped[int] = mapped_column(ForeignKey("release_notes.id"), nullable=False)
    jira_ticket_id: Mapped[int] = mapped_column(ForeignKey("jira_tickets.id"), nullable=False, index=True)
