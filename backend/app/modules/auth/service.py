"""Authentication business logic."""

from __future__ import annotations

from datetime import UTC, datetime
from dataclasses import dataclass

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import Settings
from app.modules.auth.exceptions import (
    EmailAlreadyRegisteredError,
    InvalidCredentialsError,
    RefreshTokenError,
    TokenRevokedError,
)
from app.modules.auth.models import RefreshToken, RevokedAccessToken
from app.modules.auth.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    hash_token,
    validate_password_strength,
    verify_password,
    verify_password_against_dummy,
    verify_token,
)
from app.modules.auth.schemas import (
    RefreshTokenResponse,
    ResetPasswordResponse,
    RevokeAllResponse,
)
from app.modules.users import repository
from app.modules.users.exceptions import RolesNotInitializedError
from app.modules.users.models import RoleName, User


@dataclass(frozen=True)
class LoginResult:
    """Authenticated user plus the access and refresh tokens issued at login."""

    user: User
    access_token: str
    expires_in: int
    refresh_token: str
    refresh_expires_in: int


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
    """Authenticate a user and issue a short-lived access token plus a refresh token."""

    user = authenticate_user(session, email=email, password=password)
    access_token = create_access_token(
        user_id=user.id,
        role_name=user.role.name,
        settings=settings,
    )
    refresh_token_plain, refresh_expires_at = create_refresh_token(
        user_id=user.id, settings=settings
    )
    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token_plain),
            expires_at=refresh_expires_at,
        )
    )
    session.commit()
    return LoginResult(
        user=user,
        access_token=access_token,
        expires_in=settings.access_token_expire_minutes * 60,
        refresh_token=refresh_token_plain,
        refresh_expires_in=int(
            (refresh_expires_at - datetime.now(UTC)).total_seconds()
        ),
    )


def reset_password(
    session: Session,
    *,
    email: str,
    new_password: str,
) -> ResetPasswordResponse:
    """Reset a user's password directly by email (website only, no tokens).

    Returns the same response whether or not the account exists, so the
    endpoint cannot be used to enumerate registered email addresses.

    If the account exists and is active, the password is updated.
    """

    validate_password_strength(new_password)

    normalized_email = email.strip().lower()
    user = repository.get_user_by_email(session, normalized_email)

    # Even when no account exists we still hash the provided password so
    # response timing does not trivially reveal whether the email is registered.
    verify_password_against_dummy(new_password)

    if user is not None and user.is_active:
        user.password_hash = hash_password(new_password)
        session.add(user)
        session.commit()
        session.refresh(user)

    return ResetPasswordResponse(
        message=(
            "If an account exists for this email, the password has been reset."
        ),
    )


def refresh_access_token(
    session: Session,
    *,
    refresh_token: str,
    settings: Settings,
) -> RefreshTokenResponse:
    """Exchange a valid refresh token for a new short-lived access token.

    The refresh token is looked up by its hash, then verified for expiry and
    revocation. On success the old refresh token is revoked (rotation) and a
    new one is issued so stolen refresh tokens have a short useful lifetime.
    """

    # The refresh token is opaque: we cannot derive its hash without the
    # plaintext, so we load the single most recent unrevoked candidate for the
    # caller's context is not yet known. Instead we load the latest refresh
    # token overall and verify it in constant time only when a candidate is
    # found. To keep this simple and safe, load the latest token for any user
    # and verify below; rotation re-issues per user below.
    statement = select(RefreshToken).order_by(
        RefreshToken.created_at.desc()
    )
    candidates = list(session.scalars(statement).all())

    matched: RefreshToken | None = None
    for candidate in candidates:
        if verify_token(refresh_token, candidate.token_hash):
            matched = candidate
            break

    if matched is None:
        raise RefreshTokenError()
    if not matched.is_valid:
        raise RefreshTokenError()

    user = repository.get_user_by_id(session, matched.user_id)
    if user is None or not user.is_active:
        raise RefreshTokenError()

    # Rotate: revoke the consumed refresh token.
    matched.revoked_at = datetime.now(UTC)
    session.add(matched)

    # Issue a new access token and a rotated refresh token.
    access_token = create_access_token(
        user_id=user.id,
        role_name=user.role.name,
        settings=settings,
    )
    new_plain, new_expires_at = create_refresh_token(
        user_id=user.id, settings=settings
    )
    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=hash_token(new_plain),
            expires_at=new_expires_at,
        )
    )
    session.commit()

    return RefreshTokenResponse(
        access_token=access_token,
        expires_in=settings.access_token_expire_minutes * 60,
    )


def revoke_access_token(
    session: Session,
    *,
    jti: str,
    user_id: UUID,
    expires_at: datetime,
) -> None:
    """Record an access token JTI as revoked so it is rejected before expiry."""

    exists = session.scalar(
        select(RevokedAccessToken.jti).where(RevokedAccessToken.jti == jti)
    )
    if exists is None:
        session.add(
            RevokedAccessToken(
                jti=jti,
                user_id=user_id,
                expires_at=expires_at,
            )
        )
        session.commit()


def revoke_refresh_token(
    session: Session,
    *,
    token_hash: str,
) -> None:
    """Revoke every refresh token matching the stored hash."""

    statement = select(RefreshToken).where(RefreshToken.token_hash == token_hash)
    for token in session.scalars(statement).all():
        token.revoked_at = datetime.now(UTC)
        session.add(token)
    session.commit()


def revoke_all_user_refresh_tokens(session: Session, *, user_id: UUID) -> None:
    """Revoke every refresh token belonging to a user (sign out everywhere)."""

    statement = select(RefreshToken).where(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked_at.is_(None),
    )
    for token in session.scalars(statement).all():
        token.revoked_at = datetime.now(UTC)
        session.add(token)
    session.commit()


def is_access_token_revoked(session: Session, *, jti: str) -> bool:
    """Return True when an access token JTI is present in the revocation list."""

    return (
        session.scalar(
            select(RevokedAccessToken.jti).where(RevokedAccessToken.jti == jti)
        )
        is not None
    )


def cleanup_expired_revocations(session: Session) -> int:
    """Delete expired revoked-access-token rows to keep the table bounded.

    Returns the number of rows removed.
    """

    statement = select(RevokedAccessToken).where(
        RevokedAccessToken.expires_at < datetime.now(UTC)
    )
    expired = list(session.scalars(statement).all())
    for row in expired:
        session.delete(row)
    session.commit()
    return len(expired)

