"""Password hashing and JWT security primitives."""

from __future__ import annotations

import re
import secrets
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import jwt
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError

from app.core.config import Settings, get_settings

PASSWORD_MIN_LENGTH = 12
PASSWORD_MAX_LENGTH = 128

_PASSWORD_HASHER = PasswordHasher()


class TokenValidationError(Exception):
    """A token is malformed, has invalid claims, or fails verification."""


class TokenExpiredError(TokenValidationError):
    """A token's expiration time has passed."""


@dataclass(frozen=True)
class TokenClaims:
    """Validated claims from an access token."""

    subject: UUID
    role: str
    token_type: str
    issued_at: int
    expires_at: int


def validate_password_strength(password: str) -> None:
    """Raise ``ValueError`` when a password does not meet the policy.

    The policy is intentionally shared by registration and the trusted admin
    provisioning script so both paths enforce the same requirements.
    """

    if len(password) < PASSWORD_MIN_LENGTH:
        raise ValueError(
            f"Password must be at least {PASSWORD_MIN_LENGTH} characters long."
        )
    if len(password) > PASSWORD_MAX_LENGTH:
        raise ValueError(
            f"Password must be at most {PASSWORD_MAX_LENGTH} characters long."
        )
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain a lowercase letter.")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain an uppercase letter.")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain a digit.")
    if not re.search(r"[^A-Za-z0-9]", password):
        raise ValueError("Password must contain a special character.")


def hash_password(password: str) -> str:
    """Hash a password with Argon2."""

    return _PASSWORD_HASHER.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    """Verify a password against an Argon2 hash without raising on mismatch."""

    try:
        return _PASSWORD_HASHER.verify(password_hash, password)
    except (VerificationError, InvalidHashError):
        return False


# Unknown-email logins still perform an Argon2 verification so response timing
# does not trivially reveal whether an account exists.
_DUMMY_PASSWORD_HASH = hash_password(secrets.token_urlsafe(32))


def verify_password_against_dummy(password: str) -> None:
    """Spend the same password-verification time as a real login attempt."""

    verify_password(password, _DUMMY_PASSWORD_HASH)


def create_access_token(
    *,
    user_id: UUID,
    role_name: str,
    settings: Settings | None = None,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a signed, short-lived JWT access token."""

    config = settings or get_settings()
    issued_at = datetime.now(UTC)
    lifetime = expires_delta or timedelta(
        minutes=config.access_token_expire_minutes
    )
    payload = {
        "sub": str(user_id),
        "role": role_name,
        "type": "access",
        "jti": str(uuid4()),
        "iat": issued_at,
        "exp": issued_at + lifetime,
        "iss": config.jwt_issuer,
        "aud": config.jwt_audience,
    }
    return jwt.encode(
        payload,
        config.jwt_secret_key.get_secret_value(),
        algorithm=config.jwt_algorithm,
    )


def decode_access_token(
    token: str,
    *,
    settings: Settings | None = None,
) -> TokenClaims:
    """Verify a JWT and return its validated access-token claims."""

    config = settings or get_settings()
    try:
        payload = jwt.decode(
            token,
            config.jwt_secret_key.get_secret_value(),
            algorithms=[config.jwt_algorithm],
            audience=config.jwt_audience,
            issuer=config.jwt_issuer,
            options={
                "require": ["sub", "role", "type", "jti", "iat", "exp"],
            },
        )
    except jwt.ExpiredSignatureError as exc:
        raise TokenExpiredError("Access token has expired.") from exc
    except jwt.InvalidTokenError as exc:
        raise TokenValidationError("Access token is invalid.") from exc

    if payload.get("type") != "access":
        raise TokenValidationError("The token is not an access token.")

    subject = payload.get("sub")
    try:
        user_id = UUID(str(subject))
    except (TypeError, ValueError, AttributeError) as exc:
        raise TokenValidationError("Access token subject is invalid.") from exc

    role = payload.get("role")
    if not isinstance(role, str) or not role.strip():
        raise TokenValidationError("Access token role is invalid.")

    issued_at = payload.get("iat")
    expires_at = payload.get("exp")
    if not isinstance(issued_at, int) or not isinstance(expires_at, int):
        raise TokenValidationError("Access token timestamps are invalid.")

    return TokenClaims(
        subject=user_id,
        role=role,
        token_type="access",
        issued_at=issued_at,
        expires_at=expires_at,
    )
