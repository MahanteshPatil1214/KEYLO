"""Authentication business logic."""

from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.modules.auth.exceptions import (
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
)
from app.modules.auth.security import (
    create_access_token,
    hash_password,
    validate_password_strength,
    verify_password,
    verify_password_against_dummy,
)
from app.modules.users import repository
from app.modules.users.exceptions import RolesNotInitializedError
from app.modules.users.models import RoleName, User


@dataclass(frozen=True)
class LoginResult:
    """Authenticated user plus the access token issued at login."""

    user: User
    access_token: str
    expires_in: int


def _normalize_email(email: str) -> str:
    return email.strip().lower()


def _create_user(
    session: Session,
    *,
    full_name: str,
    email: str,
    password: str,
    phone: str | None,
    role_name: RoleName,
    is_active: bool,
) -> User:
    """Create a user through a trusted internal path.

    Public registration must call :func:`register_buyer`, which hard-codes the
    buyer role. This helper exists for that path and for the trusted admin
    provisioning script.
    """

    validate_password_strength(password)
    normalized_email = _normalize_email(email)
    normalized_name = full_name.strip()
    normalized_phone = phone.strip() if phone and phone.strip() else None

    role = repository.get_role_by_name(session, role_name)
    if role is None:
        raise RolesNotInitializedError()

    if repository.get_user_by_email(session, normalized_email) is not None:
        raise EmailAlreadyRegisteredError()

    user = User(
        full_name=normalized_name,
        email=normalized_email,
        password_hash=hash_password(password),
        phone=normalized_phone,
        role_id=role.id,
        is_active=is_active,
    )
    session.add(user)
    try:
        session.commit()
    except IntegrityError as exc:
        session.rollback()
        if repository.get_user_by_email(session, normalized_email) is not None:
            raise EmailAlreadyRegisteredError() from exc
        raise

    session.refresh(user)
    return user


def register_buyer(
    session: Session,
    *,
    full_name: str,
    email: str,
    password: str,
    phone: str | None,
) -> User:
    """Register a public account with the buyer role."""

    return _create_user(
        session,
        full_name=full_name,
        email=email,
        password=password,
        phone=phone,
        role_name=RoleName.BUYER,
        is_active=True,
    )


def create_user_with_role(
    session: Session,
    *,
    full_name: str,
    email: str,
    password: str,
    phone: str | None = None,
    role_name: RoleName = RoleName.BUYER,
    is_active: bool = True,
) -> User:
    """Create a user for trusted provisioning and tests.

    This function is never reachable from public registration input. Role
    selection must come from trusted server-side code.
    """

    return _create_user(
        session,
        full_name=full_name,
        email=email,
        password=password,
        phone=phone,
        role_name=role_name,
        is_active=is_active,
    )


def authenticate_user(session: Session, *, email: str, password: str) -> User:
    """Authenticate credentials without revealing whether the email exists."""

    user = repository.get_user_by_email(session, _normalize_email(email))
    if user is None:
        verify_password_against_dummy(password)
        raise InvalidCredentialsError()

    if not verify_password(password, user.password_hash):
        raise InvalidCredentialsError()

    if not user.is_active:
        raise InvalidCredentialsError()

    return user


def login_user(
    session: Session,
    *,
    email: str,
    password: str,
    settings: Settings,
) -> LoginResult:
    """Authenticate a user and issue a short-lived access token."""

    user = authenticate_user(session, email=email, password=password)
    access_token = create_access_token(
        user_id=user.id,
        role_name=user.role.name,
        settings=settings,
    )
    return LoginResult(
        user=user,
        access_token=access_token,
        expires_in=settings.access_token_expire_minutes * 60,
    )
