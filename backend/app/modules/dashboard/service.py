"""Business logic and response assembly for dashboard analytics."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.modules.dashboard import repository
from app.modules.dashboard.exceptions import (
    InvalidMarketingSpendPeriodError,
    MarketingSpendNotFoundError,
)
from app.modules.dashboard.models import MarketingSpend, utcnow
from app.modules.dashboard.repository import AnalyticsFilters
from app.modules.dashboard.schemas import (
    DashboardFilterResponse,
    DashboardQuery,
    DashboardSummaryResponse,
    DashboardTrendResponse,
    ExecutivePerformanceItem,
    ExecutivePerformanceResponse,
    MarketingSpendCreateRequest,
    MarketingSpendListResponse,
    MarketingSpendResponse,
    MarketingSpendUpdateRequest,
    SourceLeadCount,
    SourcePerformanceItem,
    SourcePerformanceResponse,
    TrendPoint,
    TrendQuery,
)
from app.modules.leads.models import LeadSource
from app.modules.projects.exceptions import ProjectNotFoundError
from app.modules.projects.models import Project
from app.modules.users.exceptions import InsufficientPermissionsError
from app.modules.users.models import RoleName, User

_DASHBOARD_ROLES = (RoleName.ADMIN.value, RoleName.SALES_EXECUTIVE.value)


def _is_admin(actor: User) -> bool:
    return actor.role.name == RoleName.ADMIN.value


def _require_admin(actor: User) -> None:
    if not _is_admin(actor):
        raise InsufficientPermissionsError()


def _require_dashboard_access(actor: User) -> str:
    if actor.role.name not in _DASHBOARD_ROLES:
        raise InsufficientPermissionsError()
    return "ADMIN" if _is_admin(actor) else "SALES_EXECUTIVE"


def _filters(query: DashboardQuery) -> AnalyticsFilters:
    return AnalyticsFilters(
        date_from=query.date_from,
        date_to=query.date_to,
        project_id=query.project_id,
    )


def _filter_response(filters: AnalyticsFilters) -> DashboardFilterResponse:
    return DashboardFilterResponse(
        date_from=filters.date_from,
        date_to=filters.date_to,
        project_id=filters.project_id,
    )


def _rate(numerator: int, denominator: int) -> float:
    """Return a ratio, or ``0.0`` when the denominator is zero."""

    if denominator <= 0:
        return 0.0
    return numerator / denominator


def _cost_per_visit(spend: Decimal, completed_visits: int) -> float | None:
    """Return spend divided by completed visits, or ``None`` if undefined."""

    if completed_visits <= 0:
        return None
    return float(spend) / completed_visits


def _source_order(source: str) -> int:
    order = list(LeadSource)
    try:
        return order.index(LeadSource(source))
    except ValueError:
        return len(order)


def _scope_options(
    actor: User,
) -> tuple[UUID | None, bool, str]:
    """Return the executive filter, project visibility, and response scope."""

    scope = _require_dashboard_access(actor)
    if scope == "SALES_EXECUTIVE":
        return actor.id, True, scope
    return None, False, scope


def get_summary(
    session: Session,
    *,
    actor: User,
    query: DashboardQuery,
) -> DashboardSummaryResponse:
    """Build a role-scoped operational summary for the selected period."""

    executive_id, active_project_only, scope = _scope_options(actor)
    filters = _filters(query)

    lead_counts = repository.lead_metrics(
        session,
        filters=filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    bookings = repository.booking_count(
        session,
        filters=filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    visits = repository.visit_counts(
        session,
        filters=filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    cancelled = repository.cancelled_booking_count(
        session,
        filters=filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    handoffs = repository.handoff_metrics(
        session,
        filters=filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    booked_leads = repository.lead_to_visit_count(
        session,
        filters=filters,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    average_response, median_response, sample_size = (
        repository.response_time_stats(
            session,
            filters=filters,
            executive_id=executive_id,
            active_project_only=active_project_only,
        )
    )

    total_leads = lead_counts["total_leads"]
    completed_visits = visits["completed_visits"]
    no_show_visits = visits["no_show_visits"]
    conversions = lead_counts["conversions"]

    leads_by_source = [
        SourceLeadCount(source=LeadSource(row["source"]), leads=row["leads"])
        for row in repository.lead_metrics_by_source(
            session,
            filters=filters,
            executive_id=executive_id,
            active_project_only=active_project_only,
        )
        if row["leads"] > 0
    ]
    leads_by_source.sort(key=lambda item: _source_order(item.source.value))

    return DashboardSummaryResponse(
        scope=scope,
        filters=_filter_response(filters),
        total_leads=total_leads,
        new_leads=lead_counts["new_leads"],
        assigned_leads=lead_counts["assigned_leads"],
        bookings=bookings,
        completed_visits=completed_visits,
        no_show_visits=no_show_visits,
        cancelled_bookings=cancelled,
        conversions=conversions,
        handoffs_total=handoffs["handoffs_total"],
        handoffs_active=handoffs["handoffs_active"],
        handoffs_resolved=handoffs["handoffs_resolved"],
        average_first_response_seconds=average_response,
        median_first_response_seconds=median_response,
        first_response_sample_size=sample_size,
        lead_to_visit_conversion_rate=_rate(booked_leads, total_leads),
        site_visit_show_up_rate=_rate(
            completed_visits, completed_visits + no_show_visits
        ),
        lead_conversion_rate=_rate(conversions, total_leads),
        leads_by_source=leads_by_source,
    )


def get_trends(
    session: Session,
    *,
    actor: User,
    query: TrendQuery,
) -> DashboardTrendResponse:
    """Build a role-scoped time series using the requested bucket size."""

    executive_id, active_project_only, scope = _scope_options(actor)
    filters = _filters(query)
    buckets = repository.trend_counts(
        session,
        filters=filters,
        granularity=query.granularity,
        executive_id=executive_id,
        active_project_only=active_project_only,
    )
    items = [
        TrendPoint(
            period=period,
            leads=values["leads"],
            bookings=values["bookings"],
            completed_visits=values["completed_visits"],
            conversions=values["conversions"],
        )
        for period, values in sorted(buckets.items())
    ]
    return DashboardTrendResponse(
        scope=scope,
        filters=_filter_response(filters),
        granularity=query.granularity,
        items=items,
    )


def get_source_performance(
    session: Session,
    *,
    actor: User,
    query: DashboardQuery,
) -> SourcePerformanceResponse:
    """Build the admin-only source performance table."""

    _require_admin(actor)
    filters = _filters(query)

    lead_rows = {
        row["source"]: row
        for row in repository.lead_metrics_by_source(session, filters=filters)
    }
    booked_leads = repository.lead_to_visit_counts_by_source(
        session, filters=filters
    )
    booking_rows = repository.booking_counts_by_source(session, filters=filters)
    cancellation_rows = repository.cancelled_bookings_by_source(
        session, filters=filters
    )
    visit_rows = repository.visit_counts_by_source(session, filters=filters)
    spend_rows = repository.marketing_spend_by_source(session, filters=filters)

    sources = (
        set(lead_rows)
        | set(booking_rows)
        | set(cancellation_rows)
        | set(visit_rows)
        | set(spend_rows)
    )
    items: list[SourcePerformanceItem] = []
    for source_value in sorted(sources, key=_source_order):
        lead_row = lead_rows.get(source_value, {})
        visit_row = visit_rows.get(source_value, {})
        completed = int(visit_row.get("completed_visits", 0))
        no_show = int(visit_row.get("no_show_visits", 0))
        leads = int(lead_row.get("leads", 0))
        conversions = int(lead_row.get("conversions", 0))
        spend = spend_rows.get(source_value, Decimal("0"))

        items.append(
            SourcePerformanceItem(
                source=LeadSource(source_value),
                leads=leads,
                new_leads=int(lead_row.get("new_leads", 0)),
                assigned_leads=int(lead_row.get("assigned_leads", 0)),
                bookings=int(booking_rows.get(source_value, 0)),
                completed_visits=completed,
                no_show_visits=no_show,
                cancelled_bookings=int(
                    cancellation_rows.get(source_value, 0)
                ),
                conversions=conversions,
                marketing_spend=float(spend),
                cost_per_visit=_cost_per_visit(spend, completed),
                lead_to_visit_conversion_rate=_rate(
                    int(booked_leads.get(source_value, 0)), leads
                ),
                site_visit_show_up_rate=_rate(
                    completed, completed + no_show
                ),
                lead_conversion_rate=_rate(conversions, leads),
            )
        )

    return SourcePerformanceResponse(
        scope="ADMIN",
        filters=_filter_response(filters),
        items=items,
    )


def get_executive_performance(
    session: Session,
    *,
    actor: User,
    query: DashboardQuery,
) -> ExecutivePerformanceResponse:
    """Build the admin-only sales executive performance table."""

    _require_admin(actor)
    filters = _filters(query)

    executives = repository.list_active_executives(session)
    lead_rows = repository.executive_lead_metrics(session, filters=filters)
    booked_leads = repository.executive_lead_to_visit_metrics(
        session, filters=filters
    )
    booking_rows = repository.executive_booking_metrics(session, filters=filters)
    visit_rows = repository.executive_visit_metrics(session, filters=filters)
    cancellation_rows = repository.executive_cancellation_metrics(
        session, filters=filters
    )
    handoff_rows = repository.executive_handoff_metrics(
        session, filters=filters
    )

    items: list[ExecutivePerformanceItem] = []
    for executive in executives:
        lead_row = lead_rows.get(executive.id, {})
        visit_row = visit_rows.get(executive.id, {})
        handoff_row = handoff_rows.get(executive.id, {})
        assigned = int(lead_row.get("assigned_leads", 0))
        conversions = int(lead_row.get("conversions", 0))
        completed = int(visit_row.get("completed_visits", 0))
        no_show = int(visit_row.get("no_show_visits", 0))

        items.append(
            ExecutivePerformanceItem(
                executive_id=executive.id,
                full_name=executive.full_name,
                email=executive.email,
                assigned_leads=assigned,
                new_leads=int(lead_row.get("new_leads", 0)),
                bookings=int(booking_rows.get(executive.id, 0)),
                completed_visits=completed,
                no_show_visits=no_show,
                cancelled_bookings=int(
                    cancellation_rows.get(executive.id, 0)
                ),
                conversions=conversions,
                handoffs_total=int(handoff_row.get("handoffs_total", 0)),
                handoffs_active=int(handoff_row.get("handoffs_active", 0)),
                handoffs_resolved=int(
                    handoff_row.get("handoffs_resolved", 0)
                ),
                lead_to_visit_conversion_rate=_rate(
                    int(booked_leads.get(executive.id, 0)), assigned
                ),
                site_visit_show_up_rate=_rate(
                    completed, completed + no_show
                ),
                lead_conversion_rate=_rate(conversions, assigned),
            )
        )

    return ExecutivePerformanceResponse(
        scope="ADMIN",
        filters=_filter_response(filters),
        items=items,
    )


# ---------------------------------------------------------------------------
# Marketing spend management
# ---------------------------------------------------------------------------


def _ensure_project_exists(session: Session, project_id: UUID) -> None:
    if session.get(Project, project_id) is None:
        raise ProjectNotFoundError()


def create_marketing_spend(
    session: Session,
    *,
    actor: User,
    payload: MarketingSpendCreateRequest,
) -> MarketingSpendResponse:
    """Record a marketing spend entry (Admin only)."""

    _require_admin(actor)
    if payload.project_id is not None:
        _ensure_project_exists(session, payload.project_id)

    now = utcnow()
    spend = MarketingSpend(
        project_id=payload.project_id,
        source=payload.source.value,
        period_start=payload.period_start,
        period_end=payload.period_end,
        amount=payload.amount,
        notes=payload.notes,
        created_by_id=actor.id,
        created_at=now,
        updated_at=now,
    )
    repository.add_marketing_spend(session, spend)
    session.commit()
    session.refresh(spend)
    return MarketingSpendResponse.model_validate(spend)


def get_marketing_spend(
    session: Session,
    *,
    actor: User,
    spend_id: UUID,
) -> MarketingSpendResponse:
    """Return one marketing spend record (Admin only)."""

    _require_admin(actor)
    spend = repository.get_marketing_spend_by_id(session, spend_id)
    if spend is None:
        raise MarketingSpendNotFoundError()
    return MarketingSpendResponse.model_validate(spend)


def update_marketing_spend(
    session: Session,
    *,
    actor: User,
    spend_id: UUID,
    payload: MarketingSpendUpdateRequest,
) -> MarketingSpendResponse:
    """Update a marketing spend record (Admin only)."""

    _require_admin(actor)
    spend = repository.get_marketing_spend_by_id(session, spend_id)
    if spend is None:
        raise MarketingSpendNotFoundError()

    fields = payload.model_fields_set
    effective_start = (
        payload.period_start
        if "period_start" in fields
        else spend.period_start
    )
    effective_end = (
        payload.period_end if "period_end" in fields else spend.period_end
    )
    if (
        effective_start is not None
        and effective_end is not None
        and effective_start > effective_end
    ):
        raise InvalidMarketingSpendPeriodError()

    if "project_id" in fields and payload.project_id is not None:
        _ensure_project_exists(session, payload.project_id)

    if "source" in fields and payload.source is not None:
        spend.source = payload.source.value
    if "project_id" in fields:
        spend.project_id = payload.project_id
    if "period_start" in fields and payload.period_start is not None:
        spend.period_start = payload.period_start
    if "period_end" in fields and payload.period_end is not None:
        spend.period_end = payload.period_end
    if "amount" in fields and payload.amount is not None:
        spend.amount = payload.amount
    if "notes" in fields:
        spend.notes = payload.notes
    spend.updated_at = utcnow()

    session.commit()
    session.refresh(spend)
    return MarketingSpendResponse.model_validate(spend)


def delete_marketing_spend(
    session: Session,
    *,
    actor: User,
    spend_id: UUID,
) -> None:
    """Delete a marketing spend record (Admin only)."""

    _require_admin(actor)
    spend = repository.get_marketing_spend_by_id(session, spend_id)
    if spend is None:
        raise MarketingSpendNotFoundError()
    session.delete(spend)
    session.commit()


def list_marketing_spend(
    session: Session,
    *,
    actor: User,
    page: int,
    page_size: int,
    project_id: UUID | None = None,
    source: LeadSource | None = None,
    period_from: date | None = None,
    period_to: date | None = None,
) -> MarketingSpendListResponse:
    """Return a paginated marketing spend listing (Admin only)."""

    _require_admin(actor)
    total = repository.count_marketing_spends(
        session,
        project_id=project_id,
        source=source,
        period_from=period_from,
        period_to=period_to,
    )
    spends = repository.list_marketing_spends(
        session,
        offset=(page - 1) * page_size,
        limit=page_size,
        project_id=project_id,
        source=source,
        period_from=period_from,
        period_to=period_to,
    )
    pages = (total + page_size - 1) // page_size if total else 0
    return MarketingSpendListResponse(
        items=[MarketingSpendResponse.model_validate(row) for row in spends],
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


__all__ = [
    "create_marketing_spend",
    "delete_marketing_spend",
    "get_executive_performance",
    "get_marketing_spend",
    "get_source_performance",
    "get_summary",
    "get_trends",
    "list_marketing_spend",
    "update_marketing_spend",
]
