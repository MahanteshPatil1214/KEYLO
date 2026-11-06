"""User-management HTTP endpoints."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.dependencies import AdminUser, CurrentUser
from app.modules.users.models import RoleName, User
from app.modules.users.schemas import (
    UserCreateRequest,
    UserListResponse,
    UserMetricsResponse,
    UserResponse,
    UserStatusUpdateRequest,
    UserUpdateRequest,
)
from app.modules.users.service import (
    create_user_by_admin,
    get_accessible_user,
    get_user_metrics_summary,
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
    search: Annotated[str | None, Query(max_length=100)] = None,
    role: Annotated[RoleName | None, Query()] = None,
    is_active: Annotated[bool | None, Query()] = None,
) -> UserListResponse:
    """Return a paginated user list with optional filters. Requires the ADMIN role."""

    return list_users(
        db,
        actor=admin,
        page=page,
        page_size=page_size,
        search=search,
        role_name=role,
        is_active=is_active,
    )


@router.get(
    "/metrics",
    response_model=UserMetricsResponse,
    summary="Get user metrics summary (admin only)",
)
def get_metrics(
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> UserMetricsResponse:
    """Return aggregate statistics on users. Requires the ADMIN role."""

    return get_user_metrics_summary(db, actor=admin)


@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a user (admin only)",
)
def create_user(
    payload: UserCreateRequest,
    admin: AdminUser,
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Provision a new user account. Requires the ADMIN role."""

    return create_user_by_admin(
        db,
        actor=admin,
        payload=payload,
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
