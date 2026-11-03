"""Database access for users and roles."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import func, select
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


def count_users(session: Session) -> int:
    """Return the total number of user accounts."""

    return session.scalar(select(func.count()).select_from(User)) or 0


def list_users(session: Session, *, offset: int, limit: int) -> list[User]:
    """Return a page of users in stable newest-first order."""

    statement = (
        select(User)
        .order_by(User.created_at.desc(), User.id)
        .offset(offset)
        .limit(limit)
    )
    return list(session.scalars(statement).all())
