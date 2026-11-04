"""HTTP exceptions for the human handoff module."""

from __future__ import annotations

from fastapi import HTTPException, status


class HandoffNotFoundError(HTTPException):
    """The requested handoff does not exist or is not visible to the caller."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Handoff not found.",
        )


class ActiveHandoffExistsError(HTTPException):
    """An active handoff already exists for this conversation."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active human handoff already exists for this conversation.",
        )


class InvalidExecutiveError(HTTPException):
    """The assigned user is not an active sales executive."""

    def __init__(self, message: str = "Assigned user must be an active sales executive.") -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )


class InvalidHandoffStatusTransitionError(HTTPException):
    """The requested status transition violates the handoff lifecycle."""

    def __init__(self, current_status: str, requested_status: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition handoff from {current_status} to {requested_status}.",
        )


class ConversationClosedError(HTTPException):
    """Cannot request a handoff for an inactive conversation."""

    def __init__(self, status_str: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot request a human handoff for a {status_str} conversation.",
        )


class HandoffOwnershipError(HTTPException):
    """The caller does not own the conversation or have permission for this handoff."""

    def __init__(
        self, message: str = "You do not have permission to manage this handoff."
    ) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message,
        )

