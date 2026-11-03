"""Authentication HTTP endpoints."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db
from app.modules.auth.dependencies import CurrentUser
from app.modules.auth.schemas import LoginRequest, RegisterRequest, TokenResponse
from app.modules.auth.service import login_user, register_buyer
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
    summary="Log in and receive an access token",
)
def login(
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> TokenResponse:
    """Authenticate credentials and issue a short-lived access token."""

    result = login_user(
        db,
        email=str(payload.email),
        password=payload.password.get_secret_value(),
        settings=settings,
    )
    return TokenResponse(
        access_token=result.access_token,
        expires_in=result.expires_in,
    )


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the current user's profile",
)
def me(current_user: CurrentUser) -> User:
    """Return the authenticated user's safe profile fields."""

    return current_user
