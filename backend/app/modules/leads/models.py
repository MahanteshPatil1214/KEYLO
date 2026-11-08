"""SQLAlchemy models for leads and assignment history."""

from __future__ import annotations

from datetime import UTC, datetime
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    String,
    Uuid,
    false,
    func,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.projects.models import Project
from app.modules.users.models import User


class LeadSource(StrEnum):
    """Supported acquisition channels for a lead."""

    WEBSITE = "WEBSITE"
    PROPERTY_PORTAL = "PROPERTY_PORTAL"
    SOCIAL_MEDIA = "SOCIAL_MEDIA"
    HOARDING = "HOARDING"
    REFERRAL = "REFERRAL"
    OTHER = "OTHER"


class LeadStatus(StrEnum):
    """Lifecycle states for a sales lead."""

    NEW = "NEW"
    CONTACTED = "CONTACTED"
    QUALIFIED = "QUALIFIED"
    NOT_INTERESTED = "NOT_INTERESTED"
    VISIT_BOOKED = "VISIT_BOOKED"
    VISIT_CANCELLED = "VISIT_CANCELLED"
    VISITED = "VISITED"
    CONVERTED = "CONVERTED"
    LOST = "LOST"


def utcnow() -> datetime:
    """Return the current timezone-aware UTC timestamp."""

    return datetime.now(UTC)


def _quoted_values(values: type[StrEnum]) -> str:
    return ", ".join(f"'{value.value}'" for value in values)


class Lead(Base):
    """A buyer enquiry associated with a project."""

    __tablename__ = "leads"
    __table_args__ = (
        CheckConstraint(
            f"source IN ({_quoted_values(LeadSource)})",
            name="source",
        ),
        CheckConstraint(
            f"status IN ({_quoted_values(LeadStatus)})",
            name="status",
        ),
        CheckConstraint(
            "phone IS NULL OR length(phone) BETWEEN 7 AND 16",
            name="phone_length",
        ),
        CheckConstraint(
            "email IS NOT NULL OR phone IS NOT NULL",
            name="contact_required",
        ),
        CheckConstraint(
            "budget_min IS NULL OR budget_min >= 0",
            name="budget_min_non_negative",
        ),
        CheckConstraint(
            "budget_max IS NULL OR budget_max >= 0",
            name="budget_max_non_negative",
        ),
        CheckConstraint(
            "budget_min IS NULL OR budget_max IS NULL "
            "OR budget_min <= budget_max",
            name="budget_range_ordered",
        ),
        Index("ix_leads_project_id_created_at", "project_id", "created_at"),
        Index("ix_leads_status_created_at", "status", "created_at"),
        Index("ix_leads_source_created_at", "source", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str | None] = mapped_column(
        String(320), nullable=True, index=True
    )
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True, index=True)
    project_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    source: Mapped[str] = mapped_column(String(32), nullable=False)
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        default=LeadStatus.NEW.value,
        server_default=LeadStatus.NEW.value,
        index=True,
    )
    budget_min: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    budget_max: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    preferred_configuration: Mapped[str | None] = mapped_column(
        String(100), nullable=True
    )
    consent_to_contact: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )
    opted_out: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false(), index=True
    )
    opted_out_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    opted_out_reason: Mapped[str | None] = mapped_column(
        String(500), nullable=True
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

    project: Mapped[Project] = relationship()
    assignments: Mapped[list["LeadAssignment"]] = relationship(
        back_populates="lead",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="LeadAssignment.assigned_at",
    )
    current_assignment: Mapped["LeadAssignment | None"] = relationship(
        "LeadAssignment",
        primaryjoin=(
            "and_(Lead.id == LeadAssignment.lead_id, "
            "LeadAssignment.unassigned_at.is_(None))"
        ),
        viewonly=True,
        uselist=False,
        lazy="selectin",
        overlaps="assignments",
    )

    @property
    def assigned_executive_id(self) -> UUID | None:
        """Return the active assignee, if any, without duplicating storage."""

        return (
            self.current_assignment.executive_id
            if self.current_assignment is not None
            else None
        )

    @property
    def assigned_at(self) -> datetime | None:
        """Return when the active assignment began, if any."""

        return (
            self.current_assignment.assigned_at
            if self.current_assignment is not None
            else None
        )


class LeadAssignment(Base):
    """An immutable segment of a lead's assignment history."""

    __tablename__ = "lead_assignments"
    __table_args__ = (
        CheckConstraint(
            "unassigned_at IS NULL OR unassigned_at >= assigned_at",
            name="assignment_times_ordered",
        ),
        Index(
            "uq_lead_assignments_active_lead",
            "lead_id",
            unique=True,
            postgresql_where=text("unassigned_at IS NULL"),
            sqlite_where=text("unassigned_at IS NULL"),
        ),
        Index(
            "ix_lead_assignments_executive_id_assigned_at",
            "executive_id",
            "assigned_at",
        ),
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
    executive_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    assigned_by: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        server_default=func.now(),
    )
    unassigned_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    lead: Mapped[Lead] = relationship(back_populates="assignments")
    executive: Mapped[User] = relationship(foreign_keys=[executive_id])
    assigner: Mapped[User] = relationship(foreign_keys=[assigned_by])

    @property
    def is_active(self) -> bool:
        """Whether this assignment is still the lead's current one."""

        return self.unassigned_at is None
