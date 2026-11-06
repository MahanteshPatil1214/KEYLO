"""Business logic service for lead follow-ups."""

from __future__ import annotations

import logging
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.follow_ups import repository
from app.modules.follow_ups.models import (
    FollowUp,
    FollowUpOutcome,
    FollowUpPriority,
    FollowUpStatus,
    FollowUpType,
)
from app.modules.follow_ups.schemas import (
    FollowUpCompleteRequest,
    FollowUpCreateRequest,
    FollowUpListResponse,
    FollowUpMetricsResponse,
    FollowUpRescheduleRequest,
    FollowUpResponse,
    FollowUpUpdateRequest,
)
from app.modules.leads.models import Lead, LeadAssignment, LeadStatus
from app.modules.leads.repository import get_lead_by_id
from app.modules.users.models import RoleName, User

logger = logging.getLogger(__name__)


def _is_admin(actor: User) -> bool:
    return actor.role.name == RoleName.ADMIN.value


def _as_utc(dt: datetime) -> datetime:
    return dt.astimezone(UTC) if dt.tzinfo else dt.replace(tzinfo=UTC)


def _pages(total: int, page_size: int) -> int:
    return max(1, (total + page_size - 1) // page_size)


def _ensure_access(actor: User, follow_up: FollowUp) -> None:
    if _is_admin(actor):
        return
    if follow_up.executive_id == actor.id:
        return
    # Check if lead is assigned to this executive
    lead = follow_up.lead
    if lead and lead.current_assignment and lead.current_assignment.executive_id == actor.id:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="You do not have permission to access this follow-up.",
    )


def create_follow_up(
    session: Session,
    *,
    actor: User,
    payload: FollowUpCreateRequest,
) -> FollowUpResponse:
    """Create and persist a new follow-up."""
    lead = get_lead_by_id(session, payload.lead_id)
    if lead is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Lead not found.",
        )

    if not _is_admin(actor):
        if (
            lead.current_assignment is None
            or lead.current_assignment.executive_id != actor.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Sales executives can only create follow-ups for assigned leads.",
            )

    now = datetime.now(UTC)
    scheduled_utc = _as_utc(payload.scheduled_at)

    follow_up = FollowUp(
        lead_id=lead.id,
        project_id=lead.project_id,
        executive_id=actor.id,
        scheduled_at=scheduled_utc,
        type=payload.type.value,
        priority=payload.priority.value,
        status=FollowUpStatus.PENDING.value,
        notes=payload.notes,
        next_action=payload.next_action,
    )

    created = repository.create_follow_up(session, follow_up)
    session.commit()
    refreshed = repository.get_follow_up_by_id(session, created.id)
    assert refreshed is not None
    return FollowUpResponse.from_orm_model(refreshed)


def get_follow_up(
    session: Session,
    *,
    actor: User,
    follow_up_id: UUID,
) -> FollowUpResponse:
    """Fetch details of a single follow-up."""
    follow_up = repository.get_follow_up_by_id(session, follow_up_id)
    if follow_up is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found.",
        )
    _ensure_access(actor, follow_up)
    return FollowUpResponse.from_orm_model(follow_up)


def list_follow_ups(
    session: Session,
    *,
    actor: User,
    page: int,
    page_size: int,
    lead_id: UUID | None = None,
    project_id: UUID | None = None,
    status_filter: FollowUpStatus | None = None,
    type_filter: FollowUpType | None = None,
    priority_filter: FollowUpPriority | None = None,
    category: str | None = None,
    search: str | None = None,
) -> FollowUpListResponse:
    """Return paginated follow-ups matching filters within caller scope."""
    executive_id = None if _is_admin(actor) else actor.id

    total = repository.count_follow_ups(
        session,
        executive_id=executive_id,
        lead_id=lead_id,
        project_id=project_id,
        status=status_filter,
        type=type_filter,
        priority=priority_filter,
        category=category,
        search=search,
    )

    items = repository.list_follow_ups(
        session,
        offset=(page - 1) * page_size,
        limit=page_size,
        executive_id=executive_id,
        lead_id=lead_id,
        project_id=project_id,
        status=status_filter,
        type=type_filter,
        priority=priority_filter,
        category=category,
        search=search,
    )

    return FollowUpListResponse(
        items=[FollowUpResponse.from_orm_model(f) for f in items],
        total=total,
        page=page,
        page_size=page_size,
        pages=_pages(total, page_size),
    )


def update_follow_up(
    session: Session,
    *,
    actor: User,
    follow_up_id: UUID,
    payload: FollowUpUpdateRequest,
) -> FollowUpResponse:
    """Edit details of a pending follow-up."""
    follow_up = repository.get_follow_up_by_id(session, follow_up_id, for_update=True)
    if follow_up is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found.",
        )
    _ensure_access(actor, follow_up)

    if follow_up.status != FollowUpStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending follow-ups can be edited.",
        )

    if payload.scheduled_at is not None:
        follow_up.scheduled_at = _as_utc(payload.scheduled_at)
    if payload.type is not None:
        follow_up.type = payload.type.value
    if payload.priority is not None:
        follow_up.priority = payload.priority.value
    if payload.notes is not None:
        follow_up.notes = payload.notes
    if payload.next_action is not None:
        follow_up.next_action = payload.next_action

    session.commit()
    refreshed = repository.get_follow_up_by_id(session, follow_up.id)
    assert refreshed is not None
    return FollowUpResponse.from_orm_model(refreshed)


def reschedule_follow_up(
    session: Session,
    *,
    actor: User,
    follow_up_id: UUID,
    payload: FollowUpRescheduleRequest,
) -> FollowUpResponse:
    """Reschedule a follow-up to a new date and time."""
    follow_up = repository.get_follow_up_by_id(session, follow_up_id, for_update=True)
    if follow_up is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found.",
        )
    _ensure_access(actor, follow_up)

    if follow_up.status != FollowUpStatus.PENDING.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only pending follow-ups can be rescheduled.",
        )

    follow_up.scheduled_at = _as_utc(payload.scheduled_at)
    if payload.notes:
        existing = follow_up.notes or ""
        follow_up.notes = f"{existing}\n[Rescheduled]: {payload.notes}".strip()

    session.commit()
    refreshed = repository.get_follow_up_by_id(session, follow_up.id)
    assert refreshed is not None
    return FollowUpResponse.from_orm_model(refreshed)


def complete_follow_up(
    session: Session,
    *,
    actor: User,
    follow_up_id: UUID,
    payload: FollowUpCompleteRequest,
) -> FollowUpResponse:
    """Record outcome and mark follow-up as completed."""
    follow_up = repository.get_follow_up_by_id(session, follow_up_id, for_update=True)
    if follow_up is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found.",
        )
    _ensure_access(actor, follow_up)

    if follow_up.status == FollowUpStatus.COMPLETED.value:
        return FollowUpResponse.from_orm_model(follow_up)

    now = datetime.now(UTC)
    follow_up.status = FollowUpStatus.COMPLETED.value
    follow_up.outcome = payload.outcome.value
    follow_up.outcome_notes = payload.outcome_notes
    if payload.next_action:
        follow_up.next_action = payload.next_action
    follow_up.completed_at = now

    # Propagate outcome to lead if relevant
    lead = follow_up.lead
    if lead:
        if payload.outcome == FollowUpOutcome.CONVERTED:
            lead.status = LeadStatus.CONVERTED.value
        elif payload.outcome == FollowUpOutcome.NOT_INTERESTED:
            lead.status = LeadStatus.NOT_INTERESTED.value
        elif lead.status == LeadStatus.NEW.value:
            lead.status = LeadStatus.CONTACTED.value

    session.commit()
    refreshed = repository.get_follow_up_by_id(session, follow_up.id)
    assert refreshed is not None
    return FollowUpResponse.from_orm_model(refreshed)


def cancel_follow_up(
    session: Session,
    *,
    actor: User,
    follow_up_id: UUID,
    reason: str | None = None,
) -> FollowUpResponse:
    """Cancel a pending follow-up."""
    follow_up = repository.get_follow_up_by_id(session, follow_up_id, for_update=True)
    if follow_up is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Follow-up not found.",
        )
    _ensure_access(actor, follow_up)

    if follow_up.status == FollowUpStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Completed follow-ups cannot be cancelled.",
        )

    follow_up.status = FollowUpStatus.CANCELLED.value
    if reason:
        existing = follow_up.notes or ""
        follow_up.notes = f"{existing}\n[Cancelled]: {reason}".strip()

    session.commit()
    refreshed = repository.get_follow_up_by_id(session, follow_up.id)
    assert refreshed is not None
    return FollowUpResponse.from_orm_model(refreshed)


def get_metrics(
    session: Session,
    *,
    actor: User,
) -> FollowUpMetricsResponse:
    """Calculate summary metrics for caller."""
    executive_id = None if _is_admin(actor) else actor.id
    metrics = repository.get_metrics(session, executive_id=executive_id)
    return FollowUpMetricsResponse(**metrics)
