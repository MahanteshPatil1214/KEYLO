"""User-management HTTP endpoints."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import AdminUser, CurrentUser
from app.modules.users.models import User
from app.modules.users.schemas import (
    UserListResponse,
    UserResponse,
    UserStatusUpdateRequest,
    UserUpdateRequest,
)
from app.modules.users.service import (
    get_accessible_user,
    list_users,
    update_user,
    update_user_status,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "",
    response_model=UserListResponse,
    summary="List users (admin only)",
)
def get_users(
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
    page: Annotated[int, Query(ge=1)] = 1,
    page_size: Annotated[int, Query(ge=1, le=100)] = 20,
) -> UserListResponse:
    """Return a paginated user list. Requires the ADMIN role."""

    return list_users(
        db,
        actor=admin,
        page=page,
        page_size=page_size,
    )


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get a user profile",
)
def get_user(
    user_id: UUID,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Return the caller's own profile, or any profile for an admin."""

    return get_accessible_user(
        db,
        actor=current_user,
        user_id=user_id,
    )


@router.patch(
    "/{user_id}",
    response_model=UserResponse,
    summary="Update a user profile",
)
def patch_user(
    user_id: UUID,
    payload: UserUpdateRequest,
    current_user: CurrentUser,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Update permitted profile fields.

    Only admins may change another user's role, and no user may change their
    own role through this endpoint.
    """

    return update_user(
        db,
        actor=current_user,
        user_id=user_id,
        payload=payload,
    )


@router.patch(
    "/{user_id}/status",
    response_model=UserResponse,
    summary="Activate or deactivate a user (admin only)",
)
def patch_user_status(
    user_id: UUID,
    payload: UserStatusUpdateRequest,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Activate or deactivate an account. Requires the ADMIN role."""

    return update_user_status(
        db,
        actor=admin,
        user_id=user_id,
        is_active=payload.is_active,
    )
