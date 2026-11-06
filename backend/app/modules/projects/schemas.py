"""Pydantic schemas for projects, facts, and fact versions."""

from __future__ import annotations

import re
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.modules.projects.models import FactStatus, ProjectStatus

_SLUG_PATTERN = r"^[a-z0-9]+(?:-[a-z0-9]+)*$"
_CATEGORY_PATTERN = r"^[A-Z0-9][A-Z0-9 &/_.,()'\-]*$"


def normalize_slug(value: str) -> str:
    """Normalize a caller-supplied slug to lowercase kebab-case."""

    return value.strip().lower()


def normalize_category(value: str) -> str:
    """Normalize a fact category while preserving a readable label."""

    return re.sub(r"\s+", " ", value.strip().upper())


def _empty_to_none(value: object) -> object:
    if isinstance(value, str):
        stripped = value.strip()
        return stripped or None
    return value


class ProjectCreateRequest(BaseModel):
    """Admin input for creating a project."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str = Field(min_length=2, max_length=255)
    slug: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        pattern=_SLUG_PATTERN,
    )
    location: str = Field(min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    rera_number: str | None = Field(default=None, max_length=64)
    status: ProjectStatus = ProjectStatus.DRAFT

    @field_validator("slug", mode="before")
    @classmethod
    def _normalize_slug(cls, value: object) -> object:
        if isinstance(value, str):
            return normalize_slug(value) or None
        return value

    @field_validator("description", "rera_number", mode="before")
    @classmethod
    def _normalize_optional_text(cls, value: object) -> object:
        return _empty_to_none(value)


class ProjectUpdateRequest(BaseModel):
    """Admin input for updating project details and lifecycle status."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    name: str | None = Field(default=None, min_length=2, max_length=255)
    slug: str | None = Field(
        default=None,
        min_length=1,
        max_length=255,
        pattern=_SLUG_PATTERN,
    )
    location: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = Field(default=None, max_length=5000)
    rera_number: str | None = Field(default=None, max_length=64)
    status: ProjectStatus | None = None

    @field_validator("slug", mode="before")
    @classmethod
    def _normalize_slug(cls, value: object) -> object:
        if isinstance(value, str):
            return normalize_slug(value) or None
        return value

    @field_validator("description", "rera_number", mode="before")
    @classmethod
    def _normalize_optional_text(cls, value: object) -> object:
        return _empty_to_none(value)

    @model_validator(mode="after")
    def _validate_update(self) -> ProjectUpdateRequest:
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")
        for field_name in ("name", "slug", "location", "status"):
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null.")
        return self


class ProjectResponse(BaseModel):
    """Safe project representation for management and buyer reads."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    slug: str
    location: str
    description: str | None = None
    rera_number: str | None = None
    status: ProjectStatus
    created_by: UUID
    created_at: datetime
    updated_at: datetime


class ProjectListResponse(BaseModel):
    """Paginated project listing."""

    items: list[ProjectResponse]
    total: int
    page: int
    page_size: int
    pages: int


class ProjectMetricsResponse(BaseModel):
    """Aggregate counts for project and fact sheet management."""

    total_projects: int
    active_projects: int
    draft_projects: int
    inactive_projects: int
    total_facts: int
    approved_facts: int
    draft_facts: int


class FactCreateRequest(BaseModel):
    """Admin input for creating a draft fact."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    category: str = Field(
        min_length=1,
        max_length=100,
        pattern=_CATEGORY_PATTERN,
    )
    question: str = Field(min_length=1, max_length=2000)
    answer: str = Field(min_length=1, max_length=10000)

    @field_validator("category", mode="before")
    @classmethod
    def _normalize_category(cls, value: object) -> object:
        if isinstance(value, str):
            return normalize_category(value)
        return value


class FactUpdateRequest(BaseModel):
    """Admin input for editing an independently editable fact."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    category: str | None = Field(
        default=None,
        min_length=1,
        max_length=100,
        pattern=_CATEGORY_PATTERN,
    )
    question: str | None = Field(default=None, min_length=1, max_length=2000)
    answer: str | None = Field(default=None, min_length=1, max_length=10000)

    @field_validator("category", mode="before")
    @classmethod
    def _normalize_category(cls, value: object) -> object:
        if isinstance(value, str):
            return normalize_category(value)
        return value

    @model_validator(mode="after")
    def _validate_update(self) -> FactUpdateRequest:
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")
        for field_name in ("category", "question", "answer"):
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null.")
        return self


class PendingFactChanges(BaseModel):
    """Unreviewed changes staged against an approved fact."""

    category: str
    question: str
    answer: str


class FactResponse(BaseModel):
    """Management representation of a fact.

    Internal fields and pending changes are omitted by the service for
    sales-executive and buyer responses.
    """

    id: UUID
    project_id: UUID
    category: str
    question: str
    answer: str
    status: FactStatus
    updated_by: UUID | None = None
    pending_changes: PendingFactChanges | None = None
    created_at: datetime
    updated_at: datetime


class FactListResponse(BaseModel):
    """Paginated fact listing."""

    items: list[FactResponse]
    total: int
    page: int
    page_size: int
    pages: int


class FactVersionResponse(BaseModel):
    """A historical answer change for a fact."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    fact_id: UUID
    previous_answer: str | None = None
    new_answer: str
    version_number: int
    changed_by: UUID
    created_at: datetime


class FactVersionListResponse(BaseModel):
    """Paginated version history."""

    items: list[FactVersionResponse]
    total: int
    page: int
    page_size: int
    pages: int


class ApprovedFactContent(BaseModel):
    """AI-safe fact content returned by the retrieval service."""

    fact_id: UUID
    category: str
    question: str
    answer: str
