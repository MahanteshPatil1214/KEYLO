"""FastAPI routes for human handoffs."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import get_current_user
from app.modules.handoffs.models import HandoffReason, HandoffStatus
from app.modules.handoffs.schemas import (
    HandoffAssignRequest,
    HandoffCreateRequest,
    HandoffListResponse,
    HandoffResponse,
    HandoffStatusUpdateRequest,
)
from app.modules.handoffs.service import (
    assign_handoff,
    get_handoff,
    list_handoffs,
    request_handoff,
    update_handoff_status,
)
from app.modules.users.models import User

handoffs_router = APIRouter(prefix="/handoffs", tags=["Handoffs"])


@handoffs_router.post(
    "",
    response_model=HandoffResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Request a human handoff",
    description="Escalate a conversation to a human sales executive.",
)
def request_handoff_endpoint(
    payload: HandoffCreateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> HandoffResponse:
    return request_handoff(db, actor=current_user, payload=payload)


@handoffs_router.get(
    "",
    response_model=HandoffListResponse,
    summary="List handoffs",
    description="Retrieve a paginated list of human handoffs matching caller permissions.",
)
def list_handoffs_endpoint(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    project_id: Annotated[UUID | None, Query()] = None,
    lead_id: Annotated[UUID | None, Query()] = None,
    status: Annotated[HandoffStatus | None, Query()] = None,
    executive_id: Annotated[UUID | None, Query()] = None,
) -> HandoffListResponse:
    return list_handoffs(
        db,
        actor=current_user,
        page=page,
        page_size=page_size,
        project_id=project_id,
        lead_id=lead_id,
        status=status,
        executive_id=executive_id,
    )


@handoffs_router.get(
    "/{handoff_id}",
    response_model=HandoffResponse,
    summary="Get handoff details",
    description="Retrieve details and summary of an authorized handoff record.",
)
def get_handoff_endpoint(
    handoff_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> HandoffResponse:
    return get_handoff(db, actor=current_user, handoff_id=handoff_id)


@handoffs_router.post(
    "/{handoff_id}/assign",
    response_model=HandoffResponse,
    summary="Assign or reassign handoff (Admin only)",
    description="Assign a sales executive to an active handoff.",
)
def assign_handoff_endpoint(
    handoff_id: UUID,
    payload: HandoffAssignRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> HandoffResponse:
    return assign_handoff(
        db, actor=current_user, handoff_id=handoff_id, payload=payload
    )


@handoffs_router.patch(
    "/{handoff_id}/status",
    response_model=HandoffResponse,
    summary="Update handoff status",
    description="Transition handoff status and record resolution notes (Admin or assigned Executive).",
)
def update_handoff_status_endpoint(
    handoff_id: UUID,
    payload: HandoffStatusUpdateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> HandoffResponse:
    return update_handoff_status(
        db, actor=current_user, handoff_id=handoff_id, payload=payload
    )

