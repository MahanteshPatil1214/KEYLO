"""FastAPI dependencies for authentication and role authorization."""

from __future__ import annotations

from collections.abc import Callable
from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.modules.auth.exceptions import (
    InactiveUserError,
    InvalidTokenError,
    TokenRevokedError,
)
from app.modules.auth.security import TokenValidationError, decode_access_token
from app.modules.auth.service import (
    cleanup_expired_revocations,
    is_access_token_revoked,
)
from app.modules.users import repository
from app.modules.users.exceptions import InsufficientPermissionsError
from app.modules.users.models import RoleName, User

bearer_scheme = HTTPBearer(
    auto_error=False,
    scheme_name="BearerAuth",
    description=(
        "Paste only the access_token value from POST /api/v1/auth/login. "
        "Do not include the 'Bearer ' prefix in Swagger's Authorize field."
    ),
)


def get_current_user(
    credentials: Annotated[
        HTTPAuthorizationCredentials | None,
        Depends(bearer_scheme),
    ],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    """Resolve and validate the bearer token's active user."""

    if credentials is None or credentials.scheme.lower() != "bearer":
        raise InvalidTokenError()

    try:
        claims = decode_access_token(credentials.credentials)
    except TokenValidationError as exc:
        raise InvalidTokenError() from exc

    # Server-side revocation: reject access tokens whose JTI has been
    # revoked (for example on logout) before they naturally expire.
    if is_access_token_revoked(db, jti=claims.jti):
        cleanup_expired_revocations(db)
        raise TokenRevokedError() from None

    user = repository.get_user_by_id(db, claims.subject)
    if user is None:
        raise InvalidTokenError()
    if not user.is_active:
        raise InactiveUserError()
    return user


def require_roles(*roles: RoleName) -> Callable[..., User]:
    """Build a dependency that requires the current user to have one role."""

    allowed = frozenset(role.value for role in roles)

    def _require_role(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if current_user.role.name not in allowed:
            raise InsufficientPermissionsError()
        return current_user

    _require_role.__name__ = (
        "require_" + "_or_".join(sorted(role.value.lower() for role in roles))
    )
    return _require_role


CurrentUser = Annotated[User, Depends(get_current_user)]
AdminUser = Annotated[User, Depends(require_roles(RoleName.ADMIN))]
