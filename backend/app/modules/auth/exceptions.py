"""HTTP exceptions raised by the authentication module."""

from __future__ import annotations

from fastapi import HTTPException, status

_BEARER_HEADER = {"WWW-Authenticate": "Bearer"}


class EmailAlreadyRegisteredError(HTTPException):
    """An account with the submitted email already exists."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )


class InvalidCredentialsError(HTTPException):
    """Email/password authentication failed.

    The message deliberately does not distinguish an unknown email from an
    incorrect password or an inactive account.
    """

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
            headers=_BEARER_HEADER,
        )


class InvalidTokenError(HTTPException):
    """The bearer token is missing, malformed, expired, or otherwise invalid."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers=_BEARER_HEADER,
        )


class InactiveUserError(HTTPException):
    """A valid token belongs to an account that is no longer active."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is inactive.",
        )
