"""Pydantic schemas for authentication requests and responses."""

from __future__ import annotations

from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    Field,
    SecretStr,
    field_validator,
)

from app.modules.auth.security import validate_password_strength


class RegisterRequest(BaseModel):
    """Public buyer registration input.

    Extra fields are forbidden so a public client cannot smuggle in ``role``,
    ``is_active``, or other privileged account attributes.
    """

    model_config = ConfigDict(extra="forbid")

    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: SecretStr
    phone: str | None = Field(default=None, max_length=32)

    @field_validator("full_name", mode="before")
    @classmethod
    def _strip_full_name(cls, value: object) -> object:
        if isinstance(value, str):
            return value.strip()
        return value

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("password")
    @classmethod
    def _validate_password(cls, value: SecretStr) -> SecretStr:
        validate_password_strength(value.get_secret_value())
        return value

    @field_validator("phone", mode="before")
    @classmethod
    def _normalize_phone(cls, value: object) -> object:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped or None
        return value


class LoginRequest(BaseModel):
    """Email/password login input."""

    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: SecretStr

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()


class TokenResponse(BaseModel):
    """Access-token response.

    Refresh tokens are intentionally not issued in this module.
    """

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
