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
    model_validator,
)

from app.modules.auth.security import validate_password_strength


class ResetPasswordRequest(BaseModel):
    """Direct password-reset request (website only, no email tokens).

    The endpoint intentionally returns the same response whether or not the
    email is registered, so callers cannot enumerate accounts.
    """

    model_config = ConfigDict(extra="forbid")

    email: EmailStr
    password: SecretStr
    confirm_password: SecretStr

    @field_validator("email")
    @classmethod
    def _normalize_email(cls, value: EmailStr) -> str:
        return str(value).strip().lower()

    @field_validator("password")
    @classmethod
    def _validate_password(cls, value: SecretStr) -> SecretStr:
        validate_password_strength(value.get_secret_value())
        return value

    @model_validator(mode="after")
    def _passwords_match(self) -> ResetPasswordRequest:
        if self.password.get_secret_value() != self.confirm_password.get_secret_value():
            raise ValueError("Passwords do not match.")
        return self


class ResetPasswordResponse(BaseModel):
    """Response confirming the password was reset."""

    message: str


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


from app.modules.auth.security import validate_password_strength


class TokenResponse(BaseModel):
    """Access-token response, issued together with a refresh token at login.

    The access token is short-lived; the refresh token is long-lived and can
    be exchanged for a new access token until it expires or is revoked.
    """

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    refresh_token: str
    refresh_expires_in: int


class RefreshTokenRequest(BaseModel):
    """Request to exchange a refresh token for a new access token."""

    model_config = ConfigDict(extra="forbid")

    refresh_token: str = Field(min_length=1)


class RefreshTokenResponse(BaseModel):
    """New access token issued in exchange for a valid refresh token."""

    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int


class LogoutRequest(BaseModel):
    """Request to revoke the current access token and refresh token."""

    model_config = ConfigDict(extra="forbid")

    refresh_token: str | None = Field(default=None, min_length=1)


class LogoutResponse(BaseModel):
    """Confirmation that the current session was revoked."""

    message: str


class RevokeAllResponse(BaseModel):
    """Confirmation that all of a user's sessions were revoked."""

    message: str
