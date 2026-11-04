"""Pydantic schemas for dashboard metrics and marketing spend management."""

from __future__ import annotations

from datetime import UTC, date, datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)

from app.modules.dashboard.models import TrendGranularity
from app.modules.leads.models import LeadSource

DashboardScope = Literal["ADMIN", "SALES_EXECUTIVE"]


class DashboardQuery(BaseModel):
    """Shared date-range and project filters for dashboard endpoints."""

    model_config = ConfigDict(extra="forbid")

    date_from: datetime | None = None
    date_to: datetime | None = None
    project_id: UUID | None = None

    @field_validator("date_from", "date_to", mode="after")
    @classmethod
    def _normalize_utc(cls, value: datetime | None) -> datetime | None:
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)

    @model_validator(mode="after")
    def _validate_range(self) -> DashboardQuery:
        if (
            self.date_from is not None
            and self.date_to is not None
            and self.date_from > self.date_to
        ):
            raise ValueError("date_from must not be after date_to.")
        return self


class TrendQuery(DashboardQuery):
    """Filters plus a time-bucket granularity for trend series."""

    granularity: TrendGranularity = TrendGranularity.DAY


class DashboardFilterResponse(BaseModel):
    """Echo of the filters applied to a dashboard response."""

    date_from: datetime | None = None
    date_to: datetime | None = None
    project_id: UUID | None = None


class SourceLeadCount(BaseModel):
    """Lead count for one acquisition source."""

    source: LeadSource
    leads: int


class DashboardSummaryResponse(BaseModel):
    """Role-scoped operational dashboard summary."""

    scope: DashboardScope
    filters: DashboardFilterResponse
    total_leads: int
    new_leads: int
    assigned_leads: int
    bookings: int
    completed_visits: int
    no_show_visits: int
    cancelled_bookings: int
    conversions: int
    handoffs_total: int
    handoffs_active: int
    handoffs_resolved: int
    average_first_response_seconds: float | None = None
    median_first_response_seconds: float | None = None
    first_response_sample_size: int
    lead_to_visit_conversion_rate: float
    site_visit_show_up_rate: float
    lead_conversion_rate: float
    leads_by_source: list[SourceLeadCount]


class TrendPoint(BaseModel):
    """One aggregated time bucket in a trend series."""

    period: str
    leads: int
    bookings: int
    completed_visits: int
    conversions: int


class DashboardTrendResponse(BaseModel):
    """Role-scoped trend series using a requested time bucket."""

    scope: DashboardScope
    filters: DashboardFilterResponse
    granularity: TrendGranularity
    items: list[TrendPoint]


class SourcePerformanceItem(BaseModel):
    """All metrics for one lead source in the selected period."""

    source: LeadSource
    leads: int
    new_leads: int
    assigned_leads: int
    bookings: int
    completed_visits: int
    no_show_visits: int
    cancelled_bookings: int
    conversions: int
    marketing_spend: float
    cost_per_visit: float | None = None
    lead_to_visit_conversion_rate: float
    site_visit_show_up_rate: float
    lead_conversion_rate: float


class SourcePerformanceResponse(BaseModel):
    """Administrative source performance table."""

    scope: DashboardScope
    filters: DashboardFilterResponse
    items: list[SourcePerformanceItem]


class ExecutivePerformanceItem(BaseModel):
    """Aggregated performance for one active sales executive."""

    executive_id: UUID
    full_name: str
    email: str
    assigned_leads: int
    new_leads: int
    bookings: int
    completed_visits: int
    no_show_visits: int
    cancelled_bookings: int
    conversions: int
    handoffs_total: int
    handoffs_active: int
    handoffs_resolved: int
    lead_to_visit_conversion_rate: float
    site_visit_show_up_rate: float
    lead_conversion_rate: float


class ExecutivePerformanceResponse(BaseModel):
    """Administrative sales executive performance table."""

    scope: DashboardScope
    filters: DashboardFilterResponse
    items: list[ExecutivePerformanceItem]


class MarketingSpendCreateRequest(BaseModel):
    """Administrator input for recording marketing spend."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    source: LeadSource
    project_id: UUID | None = None
    period_start: date
    period_end: date
    amount: Decimal = Field(ge=0, max_digits=14, decimal_places=2)
    notes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _validate_period(self) -> MarketingSpendCreateRequest:
        if self.period_start > self.period_end:
            raise ValueError("period_start must not be after period_end.")
        return self


class MarketingSpendUpdateRequest(BaseModel):
    """Administrator input for updating a marketing spend record."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    source: LeadSource | None = None
    project_id: UUID | None = None
    period_start: date | None = None
    period_end: date | None = None
    amount: Decimal | None = Field(
        default=None, ge=0, max_digits=14, decimal_places=2
    )
    notes: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def _validate_fields(self) -> MarketingSpendUpdateRequest:
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")
        for field in ("source", "period_start", "period_end", "amount"):
            if field in self.model_fields_set and getattr(self, field) is None:
                raise ValueError(f"{field} must not be null.")
        if (
            self.period_start is not None
            and self.period_end is not None
            and self.period_start > self.period_end
        ):
            raise ValueError("period_start must not be after period_end.")
        return self


class MarketingSpendResponse(BaseModel):
    """A recorded marketing spend row."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    project_id: UUID | None = None
    source: LeadSource
    period_start: date
    period_end: date
    amount: float
    notes: str | None = None
    created_by_id: UUID | None = None
    created_at: datetime
    updated_at: datetime


class MarketingSpendListResponse(BaseModel):
    """Paginated marketing spend listing."""

    items: list[MarketingSpendResponse]
    total: int
    page: int
    page_size: int
    pages: int
