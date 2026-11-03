"""Pydantic schemas for lead intake, management, and assignment."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    field_validator,
    model_validator,
)

from app.modules.leads.models import LeadSource, LeadStatus

_PHONE_INPUT_PATTERN = re.compile(r"^\+?[0-9\s().-]+$")
_PHONE_MIN_DIGITS = 7
_PHONE_MAX_DIGITS = 15
_BUDGET_MAX = 10**12


def normalize_phone(value: str) -> str:
    """Normalize a phone number to an E.164-like ``+digits`` or ``digits`` form.

    Formatting characters are removed so ``+91 96115 02119`` and
    ``+91-96115-02119`` compare equally. A leading ``00`` is converted to
    ``+``. No country code is guessed when one is absent.
    """

    stripped = value.strip()
    if not stripped:
        raise ValueError("Phone number is required.")
    if not _PHONE_INPUT_PATTERN.fullmatch(stripped):
        raise ValueError(
            "Phone number may contain only digits, spaces, +, -, parentheses, "
            "and dots."
        )

    has_plus = stripped.startswith("+")
    if stripped.startswith("00"):
        has_plus = True
        stripped = stripped[2:]

    digits = re.sub(r"\D", "", stripped)
    if not _PHONE_MIN_DIGITS <= len(digits) <= _PHONE_MAX_DIGITS:
        raise ValueError(
            "Phone number must contain between "
            f"{_PHONE_MIN_DIGITS} and {_PHONE_MAX_DIGITS} digits."
        )
    return f"+{digits}" if has_plus else digits


def normalize_email(value: object) -> object:
    """Trim and lowercase an email, treating blank input as absent."""

    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip().lower()
        return stripped or None
    return value


def _empty_to_none(value: object) -> object:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return value


def _validate_budget_range(
    budget_min: int | None,
    budget_max: int | None,
) -> None:
    if (
        budget_min is not None
        and budget_max is not None
        and budget_min > budget_max
    ):
        raise ValueError("budget_min must not be greater than budget_max.")


class LeadCreateRequest(BaseModel):
    """Public or staff lead intake.

    Privileged fields such as status, assignment, executive IDs, and creation
    timestamps are intentionally absent and rejected as extra fields.
    """

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=1, max_length=32)
    project_id: UUID
    source: LeadSource
    budget_min: int | None = Field(default=None, ge=0, le=_BUDGET_MAX)
    budget_max: int | None = Field(default=None, ge=0, le=_BUDGET_MAX)
    preferred_configuration: str | None = Field(default=None, max_length=100)
    consent_to_contact: bool

    @field_validator("email", mode="before")
    @classmethod
    def _normalize_email(cls, value: object) -> object:
        return normalize_email(value)

    @field_validator("phone", mode="before")
    @classmethod
    def _normalize_phone(cls, value: object) -> object:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return normalize_phone(stripped) if stripped else None
        return value

    @field_validator("preferred_configuration", mode="before")
    @classmethod
    def _normalize_preferred_configuration(cls, value: object) -> object:
        return _empty_to_none(value)

    @model_validator(mode="after")
    def _validate_budget(self) -> LeadCreateRequest:
        if self.email is None and self.phone is None:
            raise ValueError(
                "At least one contact method (email or phone) is required."
            )
        _validate_budget_range(self.budget_min, self.budget_max)
        return self


class LeadUpdateRequest(BaseModel):
    """Fields an authorized caller may update on an existing lead."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, min_length=1, max_length=32)
    project_id: UUID | None = None
    source: LeadSource | None = None
    budget_min: int | None = Field(default=None, ge=0, le=_BUDGET_MAX)
    budget_max: int | None = Field(default=None, ge=0, le=_BUDGET_MAX)
    preferred_configuration: str | None = Field(default=None, max_length=100)
    consent_to_contact: bool | None = None

    @field_validator("email", mode="before")
    @classmethod
    def _normalize_email(cls, value: object) -> object:
        return normalize_email(value)

    @field_validator("phone", mode="before")
    @classmethod
    def _normalize_phone(cls, value: object) -> object:
        if isinstance(value, str):
            return normalize_phone(value)
        return value

    @field_validator("preferred_configuration", mode="before")
    @classmethod
    def _normalize_preferred_configuration(cls, value: object) -> object:
        return _empty_to_none(value)

    @model_validator(mode="after")
    def _validate_update(self) -> LeadUpdateRequest:
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")
        for field_name in (
            "full_name",
            "phone",
            "project_id",
            "source",
            "consent_to_contact",
        ):
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null.")
        _validate_budget_range(self.budget_min, self.budget_max)
        return self


class LeadStatusUpdateRequest(BaseModel):
    """Dedicated status-change input; assignment cannot be smuggled in here."""

    model_config = ConfigDict(extra="forbid")

    status: LeadStatus


class LeadAssignRequest(BaseModel):
    """Administrator input for assigning or reassigning a lead."""

    model_config = ConfigDict(extra="forbid")

    executive_id: UUID


class DuplicateCheckQuery(BaseModel):
    """At least one normalized contact value is required for a duplicate check."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=32)

    @field_validator("email", mode="before")
    @classmethod
    def _normalize_email(cls, value: object) -> object:
        return normalize_email(value)

    @field_validator("phone", mode="before")
    @classmethod
    def _normalize_phone(cls, value: object) -> object:
        if value is None:
            return None
        if isinstance(value, str):
            stripped = value.strip()
            return normalize_phone(stripped) if stripped else None
        return value

    @model_validator(mode="after")
    def _require_contact(self) -> DuplicateCheckQuery:
        if self.email is None and self.phone is None:
            raise ValueError("Provide at least one of email or phone.")
        return self


class LeadResponse(BaseModel):
    """Management representation of a lead.

    The response includes the active assignee reference but not the full
    assignment history, which has a dedicated authorized endpoint.
    """

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str | None = None
    phone: str | None = None
    project_id: UUID
    source: LeadSource
    status: LeadStatus
    budget_min: int | None = None
    budget_max: int | None = None
    preferred_configuration: str | None = None
    consent_to_contact: bool
    assigned_executive_id: UUID | None = None
    assigned_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class LeadListResponse(BaseModel):
    """Paginated lead listing."""

    items: list[LeadResponse]
    total: int
    page: int
    page_size: int
    pages: int


DuplicateField = Literal["email", "phone"]


class DuplicateCheckResponse(BaseModel):
    """Safe duplicate summary returned to authorized lead managers."""

    duplicate: bool
    matching_lead_ids: list[UUID]
    matching_fields: list[DuplicateField]
    summary: str


class LeadAssignmentResponse(BaseModel):
    """One assignment-history entry."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    lead_id: UUID
    executive_id: UUID
    assigned_by: UUID
    assigned_at: datetime
    unassigned_at: datetime | None = None
    is_active: bool


class LeadAssignmentListResponse(BaseModel):
    """Paginated assignment history."""

    items: list[LeadAssignmentResponse]
    total: int
    page: int
    page_size: int
    pages: int
