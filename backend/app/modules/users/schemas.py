"""Pydantic schemas for user responses and profile management."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.modules.users.models import RoleName


class RoleResponse(BaseModel):
    """Safe role information returned to API clients."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None


class UserResponse(BaseModel):
    """Public user representation. Password hashes must never be included."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    full_name: str
    email: str
    phone: str | None = None
    role: RoleResponse
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime


class UserListResponse(BaseModel):
    """Paginated user listing for administrators."""

    items: list[UserResponse]
    total: int
    page: int
    page_size: int
    pages: int


class UserUpdateRequest(BaseModel):
    """Fields an authorized caller may change.

    The role field is present so administrators can assign roles, but the
    service rejects any attempt by a user to change their own role.
    """

    model_config = ConfigDict(extra="forbid")

    full_name: str | None = Field(default=None, min_length=2, max_length=255)
    phone: str | None = Field(default=None, max_length=32)
    role: RoleName | None = None

    @field_validator("full_name", mode="before")
    @classmethod
    def _strip_full_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("phone", mode="before")
    @classmethod
    def _normalize_phone(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value

    @model_validator(mode="after")
    def _validate_update(self) -> UserUpdateRequest:
        if not self.model_fields_set:
            raise ValueError("At least one field must be provided.")
        if "full_name" in self.model_fields_set and self.full_name is None:
            raise ValueError("full_name cannot be null.")
        if "role" in self.model_fields_set and self.role is None:
            raise ValueError("role cannot be null.")
        return self


class UserStatusUpdateRequest(BaseModel):
    """Administrator-only account status update."""

    model_config = ConfigDict(extra="forbid")

    is_active: bool
