"""FastAPI routes for dashboard analytics and marketing spend management."""

from __future__ import annotations

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import AdminUser, require_roles
from app.modules.dashboard.schemas import (
    DashboardQuery,
    DashboardSummaryResponse,
    DashboardTrendResponse,
    ExecutivePerformanceResponse,
    MarketingSpendCreateRequest,
    MarketingSpendListResponse,
    MarketingSpendResponse,
    MarketingSpendUpdateRequest,
    SourcePerformanceResponse,
    TrendQuery,
)
from app.modules.dashboard.service import (
    create_marketing_spend,
    delete_marketing_spend,
    get_executive_performance,
    get_marketing_spend,
    get_source_performance,
    get_summary,
    get_trends,
    list_marketing_spend,
    update_marketing_spend,
)
from app.modules.leads.models import LeadSource
from app.modules.users.models import RoleName, User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

DashboardUser = Annotated[
    User,
    Depends(require_roles(RoleName.ADMIN, RoleName.SALES_EXECUTIVE)),
]


@router.get(
    "/summary",
    response_model=DashboardSummaryResponse,
    summary="Get dashboard summary",
    description=(
        "Return role-scoped operational metrics for the selected date range "
        "and project. Sales executives receive only data for their currently "
        "assigned leads on active projects."
    ),
)
def get_summary_endpoint(
    current_user: DashboardUser,
    db: Annotated[Session, Depends(get_db)],
    query: Annotated[DashboardQuery, Query()],
) -> DashboardSummaryResponse:
    return get_summary(db, actor=current_user, query=query)


@router.get(
    "/trends",
    response_model=DashboardTrendResponse,
    summary="Get dashboard trend series",
    description=(
        "Return leads, bookings, completed visits, and conversions grouped "
        "into DAY, WEEK (Monday start), or MONTH buckets."
    ),
)
def get_trends_endpoint(
    current_user: DashboardUser,
    db: Annotated[Session, Depends(get_db)],
    query: Annotated[TrendQuery, Query()],
) -> DashboardTrendResponse:
    return get_trends(db, actor=current_user, query=query)


@router.get(
    "/sources",
    response_model=SourcePerformanceResponse,
    summary="Get source performance (Admin only)",
    description=(
        "Return acquisition-source metrics and cost per completed visit. "
        "Marketing spend records with a project apply to that project; "
        "developer-wide records are included only when no project filter is "
        "active."
    ),
)
def get_sources_endpoint(
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
    query: Annotated[DashboardQuery, Query()],
) -> SourcePerformanceResponse:
    return get_source_performance(db, actor=admin, query=query)


@router.get(
    "/executives",
    response_model=ExecutivePerformanceResponse,
    summary="Get sales executive performance (Admin only)",
    description=(
        "Return aggregated lead, booking, visit, conversion, and handoff "
        "metrics for every active sales executive."
    ),
)
def get_executives_endpoint(
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
    query: Annotated[DashboardQuery, Query()],
) -> ExecutivePerformanceResponse:
    return get_executive_performance(db, actor=admin, query=query)


@router.post(
    "/marketing-spend",
    response_model=MarketingSpendResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record marketing spend (Admin only)",
)
def create_marketing_spend_endpoint(
    payload: MarketingSpendCreateRequest,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> MarketingSpendResponse:
    return create_marketing_spend(db, actor=admin, payload=payload)


@router.get(
    "/marketing-spend",
    response_model=MarketingSpendListResponse,
    summary="List marketing spend records (Admin only)",
    description=(
        "Return paginated spend records. Date filters match any record whose "
        "period overlaps the requested interval."
    ),
)
def list_marketing_spend_endpoint(
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
    project_id: Annotated[UUID | None, Query()] = None,
    source: Annotated[LeadSource | None, Query()] = None,
    period_from: Annotated[date | None, Query()] = None,
    period_to: Annotated[date | None, Query()] = None,
) -> MarketingSpendListResponse:
    return list_marketing_spend(
        db,
        actor=admin,
        page=page,
        page_size=page_size,
        project_id=project_id,
        source=source,
        period_from=period_from,
        period_to=period_to,
    )


@router.get(
    "/marketing-spend/{spend_id}",
    response_model=MarketingSpendResponse,
    summary="Get a marketing spend record (Admin only)",
)
def get_marketing_spend_endpoint(
    spend_id: UUID,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> MarketingSpendResponse:
    return get_marketing_spend(db, actor=admin, spend_id=spend_id)


@router.patch(
    "/marketing-spend/{spend_id}",
    response_model=MarketingSpendResponse,
    summary="Update a marketing spend record (Admin only)",
)
def update_marketing_spend_endpoint(
    spend_id: UUID,
    payload: MarketingSpendUpdateRequest,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> MarketingSpendResponse:
    return update_marketing_spend(
        db, actor=admin, spend_id=spend_id, payload=payload
    )


@router.delete(
    "/marketing-spend/{spend_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a marketing spend record (Admin only)",
)
def delete_marketing_spend_endpoint(
    spend_id: UUID,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> None:
    delete_marketing_spend(db, actor=admin, spend_id=spend_id)
