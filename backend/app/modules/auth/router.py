"""Authentication HTTP endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.modules.auth.dependencies import CurrentUser
from app.modules.auth.schemas import (
    LoginRequest,
    LogoutResponse,
    RefreshTokenRequest,
    RefreshTokenResponse,
    RegisterRequest,
    ResetPasswordRequest,
    ResetPasswordResponse,
    RevokeAllResponse,
    TokenResponse,
)
from app.modules.auth.service import (
    cleanup_expired_revocations,
    login_user,
    refresh_access_token,
    register_buyer,
    reset_password,
    revoke_all_user_refresh_tokens,
)
from app.modules.users.models import User
from app.modules.users.schemas import UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a buyer account",
)
def register(
    payload: RegisterRequest,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Create a public buyer account.

    Role selection is intentionally absent from the request schema; every
    public registration receives the BUYER role.
    """

    return register_buyer(
        db,
        full_name=payload.full_name,
        email=str(payload.email),
        password=payload.password.get_secret_value(),
        phone=payload.phone,
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in and receive an access token and refresh token",
)
def login(
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenResponse:
    """Authenticate credentials and issue a short-lived access token plus a
    long-lived refresh token."""

    result = login_user(
        db,
        email=str(payload.email),
        password=payload.password.get_secret_value(),
        settings=settings,
    )
    return TokenResponse(
        access_token=result.access_token,
        expires_in=result.expires_in,
        refresh_token=result.refresh_token,
        refresh_expires_in=result.refresh_expires_in,
    )


@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
    summary="Reset password directly by email (website only, no tokens)",
)
def reset_password_endpoint(
    payload: ResetPasswordRequest,
    db: Annotated[Session, Depends(get_db)],
) -> ResetPasswordResponse:
    """Reset a user's password directly by email.

    Works for every role (buyer, sales executive, administrator).  No email
    token is involved — the caller supplies the email and new password
    together.  Returns the same response whether or not the account exists,
    so the endpoint cannot be used to enumerate registered accounts.
    """

    return reset_password(
        db,
        email=payload.email,
        new_password=payload.password.get_secret_value(),
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the current user's profile",
)
def me(current_user: CurrentUser) -> User:
    """Return the authenticated user's safe profile fields."""

    return current_user


@router.post(
    "/refresh",
    response_model=RefreshTokenResponse,
    summary="Exchange a refresh token for a new access token",
)
def refresh(
    payload: RefreshTokenRequest,
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> RefreshTokenResponse:
    """Rotate a refresh token into a new short-lived access token."""

    return refresh_access_token(
        db,
        refresh_token=payload.refresh_token,
        settings=settings,
    )


@router.post(
    "/logout",
    response_model=LogoutResponse,
    summary="Revoke the current session server-side",
)
def logout(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> LogoutResponse:
    """Revoke the current session server-side.

    Every refresh token belonging to the current user is revoked, so no new
    access tokens can be issued for this account until the user logs in again.
    The current access token remains valid only until its short natural expiry.
    """

    revoke_all_user_refresh_tokens(db, user_id=current_user.id)
    cleanup_expired_revocations(db)
    return LogoutResponse(message="Logged out successfully.")


@router.post(
    "/revoke-all",
    response_model=RevokeAllResponse,
    summary="Revoke all refresh tokens for the current user",
)
def revoke_all(
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> RevokeAllResponse:
    """Revoke every refresh token for the current user (sign out everywhere)."""

    revoke_all_user_refresh_tokens(db, user_id=current_user.id)
    cleanup_expired_revocations(db)
    return RevokeAllResponse(message="All sessions revoked.")
