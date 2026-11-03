"""HTTP exceptions raised by the users module."""

from __future__ import annotations

from fastapi import HTTPException, status


class UserNotFoundError(HTTPException):
    """The requested user does not exist."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )


class UserAccessDeniedError(HTTPException):
    """The caller may not access the requested user."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this user.",
        )


class InsufficientPermissionsError(HTTPException):
    """The caller lacks the role required for an action."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to perform this action.",
        )


class RoleNotFoundError(HTTPException):
    """The requested role is not one of the configured roles."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The requested role is invalid.",
        )


class RolesNotInitializedError(HTTPException):
    """The required role rows have not been seeded."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Role configuration is unavailable.",
        )


class CannotChangeOwnRoleError(HTTPException):
    """A user attempted to change their own role."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You cannot change your own role.",
        )


class CannotDeactivateSelfError(HTTPException):
    """An administrator attempted to deactivate their own account."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account.",
        )
