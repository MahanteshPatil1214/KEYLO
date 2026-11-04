"""HTTP exceptions for the notifications and reminders module."""

from __future__ import annotations

from fastapi import HTTPException, status


class NotificationNotFoundError(HTTPException):
    """The requested notification does not exist or is not visible to the caller."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found.",
        )


class NotificationOwnershipError(HTTPException):
    """The caller does not own the requested notification."""

    def __init__(
        self, message: str = "You do not have permission to access this notification."
    ) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message,
        )
