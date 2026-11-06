"""SQLAlchemy models for lead follow-ups."""

from __future__ import annotations

from datetime import UTC, datetime, date
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.leads.models import Lead
from app.modules.projects.models import Project
from app.modules.users.models import User


class FollowUpType(StrEnum):
    """Channels/modes of follow-up."""

    CALL = "CALL"
    WHATSAPP = "WHATSAPP"
    EMAIL = "EMAIL"
    MEETING = "MEETING"
    OTHER = "OTHER"


class FollowUpPriority(StrEnum):
    """Urgency / priority of follow-up."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class FollowUpStatus(StrEnum):
    """Lifecycle state of a follow-up."""

    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"


class FollowUpOutcome(StrEnum):
    """Business result recorded upon completing a follow-up."""

    INTERESTED = "INTERESTED"
    NOT_INTERESTED = "NOT_INTERESTED"
    NO_RESPONSE = "NO_RESPONSE"
    CALLBACK_REQUESTED = "CALLBACK_REQUESTED"
    CONVERTED = "CONVERTED"


def utcnow() -> datetime:
    """Return timezone-aware current UTC time."""
    return datetime.now(UTC)


def _quoted_values(values: type[StrEnum]) -> str:
    return ", ".join(f"'{value.value}'" for value in values)


class FollowUp(Base):
    """A scheduled or completed follow-up interaction with a lead."""

    __tablename__ = "follow_ups"
    __table_args__ = (
        CheckConstraint(
            f"type IN ({_quoted_values(FollowUpType)})",
            name="ck_follow_ups_type",
        ),
        CheckConstraint(
            f"priority IN ({_quoted_values(FollowUpPriority)})",
            name="ck_follow_ups_priority",
        ),
        CheckConstraint(
            f"status IN ({_quoted_values(FollowUpStatus)})",
            name="ck_follow_ups_status",
        ),
        CheckConstraint(
            f"outcome IS NULL OR outcome IN ({_quoted_values(FollowUpOutcome)})",
            name="ck_follow_ups_outcome",
        ),
        Index("ix_follow_ups_lead_id_scheduled_at", "lead_id", "scheduled_at"),
        Index("ix_follow_ups_executive_id_scheduled_at", "executive_id", "scheduled_at"),
        Index("ix_follow_ups_project_id_scheduled_at", "project_id", "scheduled_at"),
        Index("ix_follow_ups_status_scheduled_at", "status", "scheduled_at"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    lead_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("leads.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    executive_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    scheduled_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    type: Mapped[str] = mapped_column(
        String(32), nullable=False, default=FollowUpType.CALL.value
    )
    priority: Mapped[str] = mapped_column(
        String(16), nullable=False, default=FollowUpPriority.MEDIUM.value
    )
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=FollowUpStatus.PENDING.value, index=True
    )
    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    next_action: Mapped[str | None] = mapped_column(String(500), nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(32), nullable=True)
    outcome_notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        server_default=func.now(),
        onupdate=utcnow,
    )

    # Relationships
    lead: Mapped[Lead] = relationship(foreign_keys=[lead_id])
    project: Mapped[Project] = relationship(foreign_keys=[project_id])
    executive: Mapped[User] = relationship(foreign_keys=[executive_id])

    @property
    def category(self) -> str:
        """Categorize follow-up as DUE_TODAY, OVERDUE, UPCOMING, or COMPLETED."""
        if self.status == FollowUpStatus.COMPLETED.value:
            return "COMPLETED"
        if self.status == FollowUpStatus.CANCELLED.value:
            return "CANCELLED"
        
        # PENDING follow-up comparison with today's date
        now = datetime.now(UTC)
        scheduled_utc = self.scheduled_at.astimezone(UTC) if self.scheduled_at.tzinfo else self.scheduled_at.replace(tzinfo=UTC)
        
        today_date = now.date()
        scheduled_date = scheduled_utc.date()

        if scheduled_date < today_date:
            return "OVERDUE"
        elif scheduled_date == today_date:
            return "DUE_TODAY"
        else:
            return "UPCOMING"
