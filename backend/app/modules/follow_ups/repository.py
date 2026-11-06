"""Database repository queries for follow-ups."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, joinedload

from app.modules.follow_ups.models import (
    FollowUp,
    FollowUpPriority,
    FollowUpStatus,
    FollowUpType,
)
from app.modules.leads.models import Lead, LeadAssignment
from app.modules.projects.models import Project
from app.modules.users.models import User


def create_follow_up(session: Session, follow_up: FollowUp) -> FollowUp:
    """Persist a new follow-up record."""
    session.add(follow_up)
    session.flush()
    return follow_up


def get_follow_up_by_id(
    session: Session,
    follow_up_id: UUID,
    *,
    for_update: bool = False,
) -> FollowUp | None:
    """Retrieve a follow-up by ID with loaded relationships."""
    statement = (
        select(FollowUp)
        .options(
            joinedload(FollowUp.lead),
            joinedload(FollowUp.project),
            joinedload(FollowUp.executive),
        )
        .where(FollowUp.id == follow_up_id)
    )
    if for_update:
        statement = statement.with_for_update(of=FollowUp)
    return session.scalar(statement)


def _apply_follow_up_filters(
    statement,
    *,
    executive_id: UUID | None = None,
    lead_id: UUID | None = None,
    project_id: UUID | None = None,
    status: FollowUpStatus | None = None,
    type: FollowUpType | None = None,
    priority: FollowUpPriority | None = None,
    category: str | None = None,
    search: str | None = None,
):
    """Apply caller filters and access boundaries to follow-up query."""
    if executive_id is not None:
        active_assigned_leads = (
            select(LeadAssignment.lead_id).where(
                LeadAssignment.executive_id == executive_id,
                LeadAssignment.unassigned_at.is_(None),
            )
        )
        statement = statement.where(
            or_(
                FollowUp.executive_id == executive_id,
                FollowUp.lead_id.in_(active_assigned_leads),
            )
        )

    if lead_id is not None:
        statement = statement.where(FollowUp.lead_id == lead_id)

    if project_id is not None:
        statement = statement.where(FollowUp.project_id == project_id)

    if status is not None:
        statement = statement.where(FollowUp.status == status.value)

    if type is not None:
        statement = statement.where(FollowUp.type == type.value)

    if priority is not None:
        statement = statement.where(FollowUp.priority == priority.value)

    # Dynamic Category Filtering
    if category is not None:
        now = datetime.now(UTC)
        today_start = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=UTC)
        tomorrow_start = datetime(now.year, now.month, now.day + 1, 0, 0, 0, tzinfo=UTC)

        cat_upper = category.upper()
        if cat_upper == "COMPLETED":
            statement = statement.where(FollowUp.status == FollowUpStatus.COMPLETED.value)
        elif cat_upper == "CANCELLED":
            statement = statement.where(FollowUp.status == FollowUpStatus.CANCELLED.value)
        elif cat_upper == "OVERDUE":
            statement = statement.where(
                FollowUp.status == FollowUpStatus.PENDING.value,
                FollowUp.scheduled_at < today_start,
            )
        elif cat_upper == "DUE_TODAY":
            statement = statement.where(
                FollowUp.status == FollowUpStatus.PENDING.value,
                FollowUp.scheduled_at >= today_start,
                FollowUp.scheduled_at < tomorrow_start,
            )
        elif cat_upper == "UPCOMING":
            statement = statement.where(
                FollowUp.status == FollowUpStatus.PENDING.value,
                FollowUp.scheduled_at >= tomorrow_start,
            )

    if search:
        search_like = f"%{search.strip().lower()}%"
        statement = statement.join(FollowUp.lead).join(FollowUp.project).where(
            or_(
                func.lower(Lead.full_name).like(search_like),
                func.lower(Lead.phone).like(search_like),
                func.lower(Lead.email).like(search_like),
                func.lower(Project.name).like(search_like),
                func.lower(FollowUp.notes).like(search_like),
                func.lower(FollowUp.next_action).like(search_like),
            )
        )

    return statement


def count_follow_ups(
    session: Session,
    *,
    executive_id: UUID | None = None,
    lead_id: UUID | None = None,
    project_id: UUID | None = None,
    status: FollowUpStatus | None = None,
    type: FollowUpType | None = None,
    priority: FollowUpPriority | None = None,
    category: str | None = None,
    search: str | None = None,
) -> int:
    """Return count of matching follow-up records."""
    statement = select(func.count(FollowUp.id)).select_from(FollowUp)
    statement = _apply_follow_up_filters(
        statement,
        executive_id=executive_id,
        lead_id=lead_id,
        project_id=project_id,
        status=status,
        type=type,
        priority=priority,
        category=category,
        search=search,
    )
    return int(session.scalar(statement) or 0)


def list_follow_ups(
    session: Session,
    *,
    offset: int,
    limit: int,
    executive_id: UUID | None = None,
    lead_id: UUID | None = None,
    project_id: UUID | None = None,
    status: FollowUpStatus | None = None,
    type: FollowUpType | None = None,
    priority: FollowUpPriority | None = None,
    category: str | None = None,
    search: str | None = None,
) -> list[FollowUp]:
    """Return a paginated list of follow-ups."""
    statement = (
        select(FollowUp)
        .options(
            joinedload(FollowUp.lead),
            joinedload(FollowUp.project),
            joinedload(FollowUp.executive),
        )
    )
    statement = _apply_follow_up_filters(
        statement,
        executive_id=executive_id,
        lead_id=lead_id,
        project_id=project_id,
        status=status,
        type=type,
        priority=priority,
        category=category,
        search=search,
    )
    statement = statement.order_by(FollowUp.scheduled_at.asc()).offset(offset).limit(limit)
    return list(session.scalars(statement).unique().all())


def get_metrics(
    session: Session,
    *,
    executive_id: UUID | None = None,
) -> dict[str, int]:
    """Calculate summary metrics: Total, Due Today, Overdue, Upcoming, Completed."""
    now = datetime.now(UTC)
    today_start = datetime(now.year, now.month, now.day, 0, 0, 0, tzinfo=UTC)
    tomorrow_start = datetime(now.year, now.month, now.day + 1, 0, 0, 0, tzinfo=UTC)

    base = select(FollowUp.id)
    if executive_id is not None:
        active_assigned_leads = (
            select(LeadAssignment.lead_id).where(
                LeadAssignment.executive_id == executive_id,
                LeadAssignment.unassigned_at.is_(None),
            )
        )
        base = base.where(
            or_(
                FollowUp.executive_id == executive_id,
                FollowUp.lead_id.in_(active_assigned_leads),
            )
        )

    # Total
    total = int(session.scalar(select(func.count()).select_from(base.subquery())) or 0)

    # Due Today
    due_today_stmt = base.where(
        FollowUp.status == FollowUpStatus.PENDING.value,
        FollowUp.scheduled_at >= today_start,
        FollowUp.scheduled_at < tomorrow_start,
    )
    due_today = int(session.scalar(select(func.count()).select_from(due_today_stmt.subquery())) or 0)

    # Overdue
    overdue_stmt = base.where(
        FollowUp.status == FollowUpStatus.PENDING.value,
        FollowUp.scheduled_at < today_start,
    )
    overdue = int(session.scalar(select(func.count()).select_from(overdue_stmt.subquery())) or 0)

    # Upcoming
    upcoming_stmt = base.where(
        FollowUp.status == FollowUpStatus.PENDING.value,
        FollowUp.scheduled_at >= tomorrow_start,
    )
    upcoming = int(session.scalar(select(func.count()).select_from(upcoming_stmt.subquery())) or 0)

    # Completed
    completed_stmt = base.where(FollowUp.status == FollowUpStatus.COMPLETED.value)
    completed = int(session.scalar(select(func.count()).select_from(completed_stmt.subquery())) or 0)

    return {
        "total": total,
        "due_today": due_today,
        "overdue": overdue,
        "upcoming": upcoming,
        "completed": completed,
    }
