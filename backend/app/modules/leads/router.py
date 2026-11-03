"""Lead intake, search, lifecycle, and assignment HTTP endpoints."""

from __future__ import annotations

from collections import deque
from threading import Lock
from time import monotonic
from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db
from app.modules.auth.dependencies import AdminUser, require_roles
from app.modules.leads.exceptions import LeadCreateRateLimitedError
from app.modules.leads.models import LeadSource, LeadStatus
from app.modules.leads.schemas import (
    DuplicateCheckQuery,
    DuplicateCheckResponse,
    LeadAssignmentListResponse,
    LeadAssignmentResponse,
    LeadAssignRequest,
    LeadCreateRequest,
    LeadListResponse,
    LeadResponse,
    LeadStatusUpdateRequest,
    LeadUpdateRequest,
)
from app.modules.leads.service import (
    assign_lead,
    check_duplicates,
    create_lead,
    get_lead,
    list_lead_assignments,
    list_leads,
    update_lead,
    update_lead_status,
)
from app.modules.users.models import RoleName, User

router = APIRouter(prefix="/leads", tags=["leads"])

LeadManagerUser = Annotated[
    User,
    Depends(require_roles(RoleName.ADMIN, RoleName.SALES_EXECUTIVE)),
]

_CREATE_WINDOW_SECONDS = 60
_create_attempts: dict[str, deque[float]] = {}
_create_attempts_lock = Lock()


def _enforce_create_rate_limit(request: Request) -> None:
    """Best-effort per-process protection for unauthenticated public intake.

    Production deployments should also enforce a shared rate limit at the
    reverse proxy or API gateway. The test suite disables this local limiter so
    deterministic tests are not coupled to process-wide timing.
    """

    settings = get_settings()
    if settings.environment == "testing":
        return

    client_host = request.client.host if request.client is not None else "unknown"
    now = monotonic()
    cutoff = now - _CREATE_WINDOW_SECONDS
    with _create_attempts_lock:
        attempts = _create_attempts.setdefault(client_host, deque())
        while attempts and attempts[0] <= cutoff:
            attempts.popleft()
        if len(attempts) >= settings.lead_create_rate_limit_per_minute:
            raise LeadCreateRateLimitedError()
        attempts.append(now)


@router.post(
    "",
    response_model=LeadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a lead (public website intake)",
)
def create_lead_endpoint(
    payload: LeadCreateRequest,
    request: Request,
    db: Annotated[Session, Depends(get_db)],
) -> LeadResponse:
    """Create a lead for an active project.

    Public unauthenticated creation supports the website enquiry flow. Status,
    assignment, and executive fields are rejected by the request schema.
    """

    _enforce_create_rate_limit(request)
    return create_lead(db, payload=payload)


@router.get(
    "/duplicates/check",
    response_model=DuplicateCheckResponse,
    summary="Check for duplicate leads (admin only)",
)
def check_duplicates_endpoint(
    query: Annotated[DuplicateCheckQuery, Query()],
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> DuplicateCheckResponse:
    """Return safe matching references for normalized email or phone values."""

    return check_duplicates(
        db,
        actor=admin,
        email=str(query.email) if query.email is not None else None,
        phone=query.phone,
    )


@router.get(
    "",
    response_model=LeadListResponse,
    summary="List and search leads",
)
def list_leads_endpoint(
    current_user: LeadManagerUser,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    search: Annotated[str | None, Query(max_length=255)] = None,
    project_id: UUID | None = None,
    source: LeadSource | None = None,
    lead_status: Annotated[
        LeadStatus | None,
        Query(alias="status", description="Filter by lead lifecycle status."),
    ] = None,
    assigned_executive_id: UUID | None = None,
    order: Annotated[
        Literal["asc", "desc"],
        Query(description="Order by creation time."),
    ] = "desc",
) -> LeadListResponse:
    """List leads with pagination, search, filters, and creation ordering.

    Sales executives only see leads actively assigned to them on active
    projects. Their executive filter is clamped to their own identity.
    """

    return list_leads(
        db,
        actor=current_user,
        page=page,
        page_size=page_size,
        search=search,
        project_id=project_id,
        source=source,
        status=lead_status,
        assigned_executive_id=assigned_executive_id,
        newest_first=order == "desc",
    )


@router.get(
    "/{lead_id}",
    response_model=LeadResponse,
    summary="Get a lead",
)
def get_lead_endpoint(
    lead_id: UUID,
    current_user: LeadManagerUser,
    db: Annotated[Session, Depends(get_db)],
) -> LeadResponse:
    """Return a lead when the caller is authorized to manage it."""

    return get_lead(db, actor=current_user, lead_id=lead_id)


@router.patch(
    "/{lead_id}",
    response_model=LeadResponse,
    summary="Update a lead",
)
def update_lead_endpoint(
    lead_id: UUID,
    payload: LeadUpdateRequest,
    current_user: LeadManagerUser,
    db: Annotated[Session, Depends(get_db)],
) -> LeadResponse:
    """Update contact, requirement, and consent fields.

    Administrators may also change the project and source. Sales executives may
    update only leads actively assigned to them.
    """

    return update_lead(
        db,
        actor=current_user,
        lead_id=lead_id,
        payload=payload,
    )


@router.patch(
    "/{lead_id}/status",
    response_model=LeadResponse,
    summary="Update lead status",
)
def update_lead_status_endpoint(
    lead_id: UUID,
    payload: LeadStatusUpdateRequest,
    current_user: LeadManagerUser,
    db: Annotated[Session, Depends(get_db)],
) -> LeadResponse:
    """Move a lead through the supported lifecycle transitions."""

    return update_lead_status(
        db,
        actor=current_user,
        lead_id=lead_id,
        payload=payload,
    )


@router.post(
    "/{lead_id}/assign",
    response_model=LeadAssignmentResponse,
    summary="Assign or reassign a lead (admin only)",
)
def assign_lead_endpoint(
    lead_id: UUID,
    payload: LeadAssignRequest,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> LeadAssignmentResponse:
    """Assign an active sales executive and preserve prior history."""

    return assign_lead(
        db,
        actor=admin,
        lead_id=lead_id,
        payload=payload,
    )


@router.get(
    "/{lead_id}/assignments",
    response_model=LeadAssignmentListResponse,
    summary="List lead assignment history",
)
def list_lead_assignments_endpoint(
    lead_id: UUID,
    current_user: LeadManagerUser,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> LeadAssignmentListResponse:
    """Return assignment history to admins or the current assigned executive."""

    return list_lead_assignments(
        db,
        actor=current_user,
        lead_id=lead_id,
        page=page,
        page_size=page_size,
    )
