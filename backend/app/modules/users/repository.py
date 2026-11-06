"""Database access for users and roles."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.modules.users.models import Role, RoleName, User


def get_role_by_name(session: Session, name: RoleName | str) -> Role | None:
    """Return a role by its canonical name."""

    role_value = name.value if isinstance(name, RoleName) else str(name)
    return session.scalar(
        select(Role).where(Role.name == role_value.strip().upper())
    )


def list_roles(session: Session) -> list[Role]:
    """Return all roles ordered by name."""

    return list(session.scalars(select(Role).order_by(Role.name)).all())


def get_user_by_id(session: Session, user_id: UUID) -> User | None:
    """Return a user with its role loaded, or ``None``."""

    return session.scalar(select(User).where(User.id == user_id))


def get_user_by_email(session: Session, email: str) -> User | None:
    """Return a user by normalized email, or ``None``."""

    return session.scalar(select(User).where(User.email == email.strip().lower()))


def _apply_user_filters(
    statement,
    *,
    search: str | None = None,
    role_name: RoleName | str | None = None,
    is_active: bool | None = None,
):
    if role_name:
        role_val = (
            role_name.value
            if isinstance(role_name, RoleName)
            else str(role_name).strip().upper()
        )
        statement = statement.join(User.role).where(Role.name == role_val)
    if is_active is not None:
        statement = statement.where(User.is_active == is_active)
    if search and search.strip():
        term = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                User.full_name.ilike(term),
                User.email.ilike(term),
                User.phone.ilike(term),
            )
        )
    return statement


def count_users(
    session: Session,
    *,
    search: str | None = None,
    role_name: RoleName | str | None = None,
    is_active: bool | None = None,
) -> int:
    """Return the total number of user accounts matching filters."""

    statement = select(func.count(User.id)).select_from(User)
    statement = _apply_user_filters(
        statement,
        search=search,
        role_name=role_name,
        is_active=is_active,
    )
    return session.scalar(statement) or 0


def list_users(
    session: Session,
    *,
    offset: int,
    limit: int,
    search: str | None = None,
    role_name: RoleName | str | None = None,
    is_active: bool | None = None,
) -> list[User]:
    """Return a page of users in stable newest-first order matching filters."""

    statement = select(User)
    statement = _apply_user_filters(
        statement,
        search=search,
        role_name=role_name,
        is_active=is_active,
    )
    statement = statement.order_by(User.created_at.desc(), User.id).offset(offset).limit(limit)
    return list(session.scalars(statement).unique().all())


def get_user_metrics(session: Session) -> dict[str, int]:
    """Compute aggregate counts across roles and statuses."""

    total = session.scalar(select(func.count(User.id))) or 0
    active = session.scalar(select(func.count(User.id)).where(User.is_active.is_(True))) or 0
    deactivated = session.scalar(select(func.count(User.id)).where(User.is_active.is_(False))) or 0

    role_counts = dict(
        session.execute(
            select(Role.name, func.count(User.id))
            .join(User.role)
            .group_by(Role.name)
        ).all()
    )

    return {
        "total": total,
        "active": active,
        "deactivated": deactivated,
        "admins": role_counts.get(RoleName.ADMIN.value, 0),
        "sales_executives": role_counts.get(RoleName.SALES_EXECUTIVE.value, 0),
        "buyers": role_counts.get(RoleName.BUYER.value, 0),
    }
