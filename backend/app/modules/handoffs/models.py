"""SQLAlchemy models for human handoffs."""

from __future__ import annotations

from datetime import UTC, datetime
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
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.conversations.models import Conversation
from app.modules.leads.models import Lead
from app.modules.projects.models import Project
from app.modules.users.models import User


class HandoffStatus(StrEnum):
    """Lifecycle states for a human handoff."""

    PENDING = "PENDING"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CANCELLED = "CANCELLED"


ACTIVE_HANDOFF_STATUSES: tuple[str, ...] = (
    HandoffStatus.PENDING.value,
    HandoffStatus.ASSIGNED.value,
    HandoffStatus.IN_PROGRESS.value,
)


class HandoffReason(StrEnum):
    """Reasons triggering human escalation."""

    BUYER_REQUESTED = "BUYER_REQUESTED"
    FACT_UNAVAILABLE = "FACT_UNAVAILABLE"
    AI_FALLBACK = "AI_FALLBACK"
    COMPLEX_QUERY = "COMPLEX_QUERY"
    OTHER = "OTHER"


def utcnow() -> datetime:
    """Return the current timezone-aware UTC timestamp."""

    return datetime.now(UTC)


def _quoted_values(values: type[StrEnum]) -> str:
    return ", ".join(f"'{value.value}'" for value in values)


class Handoff(Base):
    """A human handoff record escalating a conversation to a sales executive."""

    __tablename__ = "handoffs"
    __table_args__ = (
        CheckConstraint(
            f"status IN ({_quoted_values(HandoffStatus)})",
            name="ck_handoffs_status",
        ),
        CheckConstraint(
            f"reason IN ({_quoted_values(HandoffReason)})",
            name="ck_handoffs_reason",
        ),
        CheckConstraint(
            "length(summary) > 0",
            name="ck_handoffs_summary_non_empty",
        ),
        Index("ix_handoffs_conversation_id_created_at", "conversation_id", "created_at"),
        Index("ix_handoffs_lead_id_created_at", "lead_id", "created_at"),
        Index("ix_handoffs_project_id_created_at", "project_id", "created_at"),
        Index("ix_handoffs_executive_id_created_at", "executive_id", "created_at"),
        Index("ix_handoffs_status_created_at", "status", "created_at"),
        Index(
            "uq_handoffs_conversation_active",
            "conversation_id",
            unique=True,
            postgresql_where=text("status IN ('PENDING', 'ASSIGNED', 'IN_PROGRESS')"),
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    conversation_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
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
    executive_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    created_by_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=HandoffStatus.PENDING.value,
        server_default=HandoffStatus.PENDING.value,
        index=True,
    )
    reason: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default=HandoffReason.BUYER_REQUESTED.value,
        server_default=HandoffReason.BUYER_REQUESTED.value,
    )
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    assigned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolved_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    resolved_by_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        server_default=func.now(),
        index=True,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        server_default=func.now(),
        onupdate=utcnow,
    )

    conversation: Mapped[Conversation] = relationship(lazy="joined")
    lead: Mapped[Lead] = relationship(lazy="joined")
    project: Mapped[Project] = relationship(lazy="joined")
    executive: Mapped[User | None] = relationship(
        foreign_keys=[executive_id], lazy="joined"
    )
    created_by: Mapped[User | None] = relationship(
        foreign_keys=[created_by_id], lazy="joined"
    )
    resolved_by: Mapped[User | None] = relationship(
        foreign_keys=[resolved_by_id], lazy="joined"
    )

