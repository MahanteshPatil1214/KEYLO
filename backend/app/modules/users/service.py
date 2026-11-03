"""User-management and role-seeding business logic."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.modules.users import repository
from app.modules.users.exceptions import (
    CannotChangeOwnRoleError,
    CannotDeactivateSelfError,
    InsufficientPermissionsError,
    RoleNotFoundError,
    UserAccessDeniedError,
    UserNotFoundError,
)
from app.modules.users.models import Role, RoleName, User
from app.modules.users.schemas import UserListResponse, UserUpdateRequest

_ROLE_DESCRIPTIONS: dict[RoleName, str] = {
    RoleName.BUYER: "Buyer account",
    RoleName.SALES_EXECUTIVE: "Sales executive account",
    RoleName.ADMIN: "Administrator account",
}


def seed_roles(session: Session) -> list[RoleName]:
    """Create any missing built-in roles and return the roles created.

    Re-running the function is safe: existing roles are left untouched and a
    concurrent insert conflict is treated as another process having completed
    the same idempotent seed.
    """

    existing_names = {role.name for role in repository.list_roles(session)}
    created: list[RoleName] = []
    for role_name in RoleName:
        if role_name.value not in existing_names:
            session.add(
                Role(
                    name=role_name.value,
                    description=_ROLE_DESCRIPTIONS[role_name],
                )
            )
            created.append(role_name)

    if created:
        try:
            session.commit()
        except IntegrityError:
            session.rollback()
            return []

    return created


def _is_admin(user: User) -> bool:
    return user.role.name == RoleName.ADMIN.value


def _require_admin(user: User) -> None:
    if not _is_admin(user):
        raise InsufficientPermissionsError()


def _get_existing_user(session: Session, user_id: UUID) -> User:
    user = repository.get_user_by_id(session, user_id)
    if user is None:
        raise UserNotFoundError()
    return user


def get_accessible_user(
    session: Session,
    *,
    actor: User,
    user_id: UUID,
) -> User:
    """Return a user only when the actor is an admin or the user themself."""

    user = _get_existing_user(session, user_id)
    if not _is_admin(actor) and actor.id != user.id:
        raise UserAccessDeniedError()
    return user


def list_users(
    session: Session,
    *,
    actor: User,
    page: int,
    page_size: int,
) -> UserListResponse:
    """Return a paginated user listing for administrators."""

    _require_admin(actor)
    total = repository.count_users(session)
    items = repository.list_users(
        session,
        offset=(page - 1) * page_size,
        limit=page_size,
    )
    pages = (total + page_size - 1) // page_size if total else 0
    return UserListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


def update_user(
    session: Session,
    *,
    actor: User,
    user_id: UUID,
    payload: UserUpdateRequest,
) -> User:
    """Update a user's permitted profile fields and, for admins, their role."""

    user = get_accessible_user(session, actor=actor, user_id=user_id)
    fields = payload.model_dump(exclude_unset=True)

    if "role" in fields:
        if actor.id == user.id:
            raise CannotChangeOwnRoleError()
        if not _is_admin(actor):
            raise InsufficientPermissionsError()

        requested_role = fields.pop("role")
        role = repository.get_role_by_name(session, requested_role)
        if role is None:
            raise RoleNotFoundError()
        user.role = role

    if "full_name" in fields:
        user.full_name = fields["full_name"]

    if "phone" in fields:
        user.phone = fields["phone"]

    session.commit()
    session.refresh(user)
    return user


def update_user_status(
    session: Session,
    *,
    actor: User,
    user_id: UUID,
    is_active: bool,
) -> User:
    """Activate or deactivate a user. Administrator access is required."""

    _require_admin(actor)
    user = _get_existing_user(session, user_id)

    if actor.id == user.id and not is_active:
        raise CannotDeactivateSelfError()

    user.is_active = is_active
    session.commit()
    session.refresh(user)
    return user
