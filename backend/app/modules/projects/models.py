"""Project and approved fact-sheet models."""

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
    UniqueConstraint,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.users.models import User


class ProjectStatus(StrEnum):
    """Lifecycle states for a project."""

    DRAFT = "DRAFT"
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"


class FactStatus(StrEnum):
    """Approval states for a project fact."""

    DRAFT = "DRAFT"
    APPROVED = "APPROVED"


def utcnow() -> datetime:
    """Return the current timezone-aware UTC timestamp."""

    return datetime.now(UTC)


class Project(Base):
    """A developer project with a controlled lifecycle."""

    __tablename__ = "projects"
    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT', 'ACTIVE', 'INACTIVE')",
            name="status",
        ),
        Index("ix_projects_status_created_at", "status", "created_at"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(255), nullable=False, unique=True, index=True
    )
    location: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    rera_number: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default=ProjectStatus.DRAFT.value,
        server_default=ProjectStatus.DRAFT.value,
        index=True,
    )
    created_by: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
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

    creator: Mapped[User] = relationship(foreign_keys=[created_by])
    facts: Mapped[list["ProjectFact"]] = relationship(
        back_populates="project",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class ProjectFact(Base):
    """A question and answer belonging to one project.

    For an approved fact, the canonical ``category``, ``question``, and
    ``answer`` remain unchanged while an edit is staged in the ``pending_*``
    columns. Publishing the pending values requires an explicit approval.
    """

    __tablename__ = "project_facts"
    __table_args__ = (
        CheckConstraint(
            "status IN ('DRAFT', 'APPROVED')",
            name="status",
        ),
        CheckConstraint(
            "("
            "pending_category IS NULL AND pending_question IS NULL "
            "AND pending_answer IS NULL"
            ") OR ("
            "pending_category IS NOT NULL AND pending_question IS NOT NULL "
            "AND pending_answer IS NOT NULL"
            ")",
            name="pending_changes_complete",
        ),
        Index("ix_project_facts_project_id_status", "project_id", "status"),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    project_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    category: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    question: Mapped[str] = mapped_column(Text, nullable=False)
    answer: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        default=FactStatus.DRAFT.value,
        server_default=FactStatus.DRAFT.value,
        index=True,
    )
    updated_by: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    pending_category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    pending_question: Mapped[str | None] = mapped_column(Text, nullable=True)
    pending_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
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

    project: Mapped[Project] = relationship(back_populates="facts")
    updater: Mapped[User] = relationship(foreign_keys=[updated_by])
    versions: Mapped[list["FactVersion"]] = relationship(
        back_populates="fact",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="FactVersion.version_number",
    )


class FactVersion(Base):
    """Append-only history of answer changes for a fact."""

    __tablename__ = "fact_versions"
    __table_args__ = (
        UniqueConstraint(
            "fact_id",
            "version_number",
            name="uq_fact_versions_fact_id_version_number",
        ),
        CheckConstraint(
            "version_number > 0",
            name="version_number_positive",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    fact_id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("project_facts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    previous_answer: Mapped[str | None] = mapped_column(Text, nullable=True)
    new_answer: Mapped[str] = mapped_column(Text, nullable=False)
    version_number: Mapped[int] = mapped_column(nullable=False)
    changed_by: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utcnow,
        server_default=func.now(),
    )

    fact: Mapped[ProjectFact] = relationship(back_populates="versions")
    changer: Mapped[User] = relationship(foreign_keys=[changed_by])
