"""HTTP endpoints for sales executive lead follow-ups."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import CurrentUser
from app.modules.follow_ups.models import (
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
from app.modules.follow_ups import service

router = APIRouter(prefix="/follow-ups", tags=["follow-ups"])


class CancelFollowUpRequest(BaseModel):
    """Input payload to cancel a follow-up."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    reason: str | None = Field(default=None, max_length=500)


@router.post(
    "",
    response_model=FollowUpResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Schedule a new lead follow-up",
)
def create_follow_up_endpoint(
    payload: FollowUpCreateRequest,
    current_user: CurrentUser,
    session: Annotated[Session, Depends(get_db)],
) -> FollowUpResponse:
    """Schedule a new follow-up interaction with an assigned lead."""
    return service.create_follow_up(session, actor=current_user, payload=payload)


@router.get(
    "/metrics",
    response_model=FollowUpMetricsResponse,
    summary="Get follow-up metrics",
)
def get_metrics_endpoint(
    current_user: CurrentUser,
    session: Annotated[Session, Depends(get_db)],
) -> FollowUpMetricsResponse:
    """Retrieve summary metrics: Total, Due Today, Overdue, Upcoming, Completed."""
    return service.get_metrics(session, actor=current_user)


@router.get(
    "",
    response_model=FollowUpListResponse,
    summary="List follow-ups",
)
def list_follow_ups_endpoint(
    current_user: CurrentUser,
    session: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    lead_id: UUID | None = None,
    project_id: UUID | None = None,
    status_filter: FollowUpStatus | None = Query(default=None, alias="status"),
    type_filter: FollowUpType | None = Query(default=None, alias="type"),
    priority_filter: FollowUpPriority | None = Query(default=None, alias="priority"),
    category: str | None = None,
    search: str | None = None,
) -> FollowUpListResponse:
    """List follow-ups matching query filters with caller RBAC scoping."""
    return service.list_follow_ups(
        session,
        actor=current_user,
        page=page,
        page_size=page_size,
        lead_id=lead_id,
        project_id=project_id,
        status_filter=status_filter,
        type_filter=type_filter,
        priority_filter=priority_filter,
        category=category,
        search=search,
    )


@router.get(
    "/{follow_up_id}",
    response_model=FollowUpResponse,
    summary="Get follow-up details",
)
def get_follow_up_endpoint(
    follow_up_id: UUID,
    current_user: CurrentUser,
    session: Annotated[Session, Depends(get_db)],
) -> FollowUpResponse:
    """Retrieve complete details for a single follow-up."""
    return service.get_follow_up(session, actor=current_user, follow_up_id=follow_up_id)


@router.patch(
    "/{follow_up_id}",
    response_model=FollowUpResponse,
    summary="Edit follow-up",
)
def update_follow_up_endpoint(
    follow_up_id: UUID,
    payload: FollowUpUpdateRequest,
    current_user: CurrentUser,
    session: Annotated[Session, Depends(get_db)],
) -> FollowUpResponse:
    """Edit details of a pending follow-up."""
    return service.update_follow_up(
        session, actor=current_user, follow_up_id=follow_up_id, payload=payload
    )


@router.post(
    "/{follow_up_id}/reschedule",
    response_model=FollowUpResponse,
    summary="Reschedule follow-up",
)
def reschedule_follow_up_endpoint(
    follow_up_id: UUID,
    payload: FollowUpRescheduleRequest,
    current_user: CurrentUser,
    session: Annotated[Session, Depends(get_db)],
) -> FollowUpResponse:
    """Reschedule a follow-up to a new date and time."""
    return service.reschedule_follow_up(
        session, actor=current_user, follow_up_id=follow_up_id, payload=payload
    )


@router.post(
    "/{follow_up_id}/complete",
    response_model=FollowUpResponse,
    summary="Complete follow-up and record outcome",
)
def complete_follow_up_endpoint(
    follow_up_id: UUID,
    payload: FollowUpCompleteRequest,
    current_user: CurrentUser,
    session: Annotated[Session, Depends(get_db)],
) -> FollowUpResponse:
    """Record follow-up outcome and mark completed."""
    return service.complete_follow_up(
        session, actor=current_user, follow_up_id=follow_up_id, payload=payload
    )


@router.post(
    "/{follow_up_id}/cancel",
    response_model=FollowUpResponse,
    summary="Cancel follow-up",
)
def cancel_follow_up_endpoint(
    follow_up_id: UUID,
    payload: CancelFollowUpRequest,
    current_user: CurrentUser,
    session: Annotated[Session, Depends(get_db)],
) -> FollowUpResponse:
    """Cancel a pending follow-up."""
    return service.cancel_follow_up(
        session, actor=current_user, follow_up_id=follow_up_id, reason=payload.reason
    )
