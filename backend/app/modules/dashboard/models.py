"""SQLAlchemy models for administrative marketing spend records."""

from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal
from enum import StrEnum
from uuid import UUID, uuid4

from sqlalchemy import (
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Numeric,
    String,
    Uuid,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.modules.leads.models import LeadSource
from app.modules.projects.models import Project
from app.modules.users.models import User


class TrendGranularity(StrEnum):
    """Supported time buckets for dashboard trend series."""

    DAY = "DAY"
    WEEK = "WEEK"
    MONTH = "MONTH"


def utcnow() -> datetime:
    """Return the current timezone-aware UTC timestamp."""

    return datetime.now(UTC)


def _quoted_values(values: type[StrEnum]) -> str:
    return ", ".join(f"'{value.value}'" for value in values)


class MarketingSpend(Base):
    """Recorded marketing spend for an acquisition source and period.

    A record with a ``project_id`` is attributed to that project. A record
    without one represents developer-wide spend and is only included when the
    dashboard is not filtered to a single project.
    """

    __tablename__ = "marketing_spends"
    __table_args__ = (
        CheckConstraint(
            f"source IN ({_quoted_values(LeadSource)})",
            name="ck_marketing_spends_source",
        ),
        CheckConstraint(
            "period_start <= period_end",
            name="ck_marketing_spends_period_ordered",
        ),
        CheckConstraint(
            "amount >= 0",
            name="ck_marketing_spends_amount_non_negative",
        ),
        Index(
            "ix_marketing_spends_source_period",
            "source",
            "period_start",
            "period_end",
        ),
        Index(
            "ix_marketing_spends_project_id_period",
            "project_id",
            "period_start",
        ),
    )

    id: Mapped[UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid4
    )
    project_id: Mapped[UUID | None] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("projects.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    source: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    period_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    period_end: Mapped[date] = mapped_column(Date, nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    notes: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_by_id: Mapped[UUID | None] = mapped_column(
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

    project: Mapped[Project | None] = relationship()
    created_by: Mapped[User | None] = relationship()
