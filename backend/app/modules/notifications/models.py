"""SQLAlchemy models for in-app notifications and reminder tracking."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    Uuid,
    false,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.bookings.models import Booking
from app.modules.handoffs.models import Handoff
from app.modules.leads.models import Lead
from app.modules.projects.models import Project
from app.modules.users.models import User


class NotificationType(StrEnum):
    """Supported notification categories."""

    LEAD_ASSIGNED = "LEAD_ASSIGNED"
    HANDOFF_ASSIGNED = "HANDOFF_ASSIGNED"
    HANDOFF_STATUS_UPDATED = "HANDOFF_STATUS_UPDATED"
    BOOKING_CONFIRMED = "BOOKING_CONFIRMED"
    BOOKING_CANCELLED = "BOOKING_CANCELLED"
    VISIT_REMINDER_24H = "VISIT_REMINDER_24H"
    VISIT_REMINDER_2H = "VISIT_REMINDER_2H"
    SYSTEM = "SYSTEM"


def utcnow() -> datetime:
    """Return the current timezone-aware UTC timestamp."""

    return datetime.now(UTC)


def _quoted_values(values: type[StrEnum]) -> str:
    return ", ".join(f"'{value.value}'" for value in values)


class Notification(Base):
    """An in-app notification linked to a user with delivery idempotency."""

    __tablename__ = "notifications"
    __table_args__ = (
        CheckConstraint(
            f"type IN ({_quoted_values(NotificationType)})",
            name="ck_notifications_type",
        ),
        CheckConstraint(
            "length(title) > 0",
            name="ck_notifications_title_non_empty",
        ),
        CheckConstraint(
            "length(message) > 0",
            name="ck_notifications_message_non_empty",
        ),
        Index("ix_notifications_user_id_created_at", "user_id", "created_at"),
        Index("ix_notifications_user_id_is_read", "user_id", "is_read"),
        Index("ix_notifications_type_created_at", "type", "created_at"),
        Index(
            "uq_notifications_idempotency_key",
            "idempotency_key",
            unique=True,
            postgresql_where=text("idempotency_key IS NOT NULL"),
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    user_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    type: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default=NotificationType.SYSTEM.value,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default=false(),
        index=True,
    )
    read_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    idempotency_key: Mapped[str | None] = mapped_column(
        String(128),
        nullable=True,
        index=True,
    )
    lead_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("leads.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    booking_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("bookings.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    handoff_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("handoffs.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    project_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
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

    user: Mapped[User] = relationship(lazy="joined")
    lead: Mapped[Lead | None] = relationship(lazy="joined")
    booking: Mapped[Booking | None] = relationship(lazy="joined")
    handoff: Mapped[Handoff | None] = relationship(lazy="joined")
    project: Mapped[Project | None] = relationship(lazy="joined")
