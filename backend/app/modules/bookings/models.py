"""SQLAlchemy models for visit slots and site visit bookings."""

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
    Integer,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.leads.models import Lead
from app.modules.projects.models import Project
from app.modules.users.models import User


class BookingStatus(StrEnum):
    """Lifecycle states for a site visit booking."""

    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    CANCELLED = "CANCELLED"
    COMPLETED = "COMPLETED"
    NO_SHOW = "NO_SHOW"


ACTIVE_BOOKING_STATUSES: tuple[str, ...] = (
    BookingStatus.PENDING.value,
    BookingStatus.CONFIRMED.value,
)


def utcnow() -> datetime:
    """Return the current timezone-aware UTC timestamp."""

    return datetime.now(UTC)


def _quoted_values(values: type[StrEnum]) -> str:
    return ", ".join(f"'{value.value}'" for value in values)


class VisitSlot(Base):
    """An available time window for prospective buyers to visit a project."""

    __tablename__ = "visit_slots"
    __table_args__ = (
        CheckConstraint(
            "start_time < end_time",
            name="ck_visit_slots_start_before_end",
        ),
        CheckConstraint(
            "capacity >= 1",
            name="ck_visit_slots_capacity_positive",
        ),
        UniqueConstraint(
            "project_id",
            "start_time",
            "end_time",
            name="uq_visit_slots_project_time_range",
        ),
        Index("ix_visit_slots_project_id_start_time", "project_id", "start_time"),
        Index("ix_visit_slots_is_active_start_time", "is_active", "start_time"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    project_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    start_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, index=True
    )
    end_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    capacity: Mapped[int] = mapped_column(
        Integer, nullable=False, default=1, server_default="1"
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true", index=True
    )
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
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

    project: Mapped[Project] = relationship()
    bookings: Mapped[list[Booking]] = relationship(
        back_populates="slot",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class Booking(Base):
    """A site visit reservation linked to a visit slot, lead, and project."""

    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint(
            f"status IN ({_quoted_values(BookingStatus)})",
            name="ck_bookings_status",
        ),
        Index("ix_bookings_slot_id_status", "slot_id", "status"),
        Index("ix_bookings_buyer_id_created_at", "buyer_id", "created_at"),
        Index("ix_bookings_project_id_created_at", "project_id", "created_at"),
        Index("ix_bookings_lead_id_created_at", "lead_id", "created_at"),
        Index("ix_bookings_executive_id_created_at", "executive_id", "created_at"),
        Index(
            "uq_bookings_lead_slot_active",
            "lead_id",
            "slot_id",
            unique=True,
            postgresql_where=text("status NOT IN ('CANCELLED')"),
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    slot_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("visit_slots.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    lead_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("leads.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    project_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    buyer_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    executive_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=BookingStatus.CONFIRMED.value,
        server_default=BookingStatus.CONFIRMED.value,
        index=True,
    )
    cancellation_reason: Mapped[str | None] = mapped_column(
        String(500), nullable=True
    )
    cancelled_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    cancelled_by_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
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

    slot: Mapped[VisitSlot] = relationship(back_populates="bookings")
    lead: Mapped[Lead] = relationship()
    project: Mapped[Project] = relationship()
    buyer: Mapped[User] = relationship(foreign_keys=[buyer_id])
    executive: Mapped[User | None] = relationship(foreign_keys=[executive_id])
    cancelled_by: Mapped[User | None] = relationship(foreign_keys=[cancelled_by_id])

