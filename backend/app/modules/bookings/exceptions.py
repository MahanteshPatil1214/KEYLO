"""HTTP exceptions for the visit slots and bookings module."""

from __future__ import annotations

from fastapi import HTTPException, status


class SlotNotFoundError(HTTPException):
    """The specified visit slot does not exist."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit slot not found.",
        )


class BookingNotFoundError(HTTPException):
    """The booking does not exist or is not visible to the caller."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found.",
        )


class SlotCapacityExceededError(HTTPException):
    """Attempted to book a slot that has no remaining capacity."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="The selected visit slot is fully booked. Please select another time slot.",
        )


class DuplicateBookingError(HTTPException):
    """The lead already has an active booking on this slot."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="An active booking already exists for this lead on this slot.",
        )


class SlotInactiveError(HTTPException):
    """The visit slot has been deactivated."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The selected visit slot is inactive.",
        )


class PastSlotBookingError(HTTPException):
    """Cannot book a visit slot whose start time has already passed."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot book a visit slot in the past.",
        )


class InvalidSlotTimeError(HTTPException):
    """Slot start time must be strictly before end time."""

    def __init__(self, message: str = "Slot start time must be before end time.") -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )


class SlotConflictError(HTTPException):
    """A slot with this time range already exists for the project."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail="A visit slot with this exact time range already exists for this project.",
        )


class ProjectNotActiveError(HTTPException):
    """Visit slots and bookings can only be created for active projects."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Site visits can only be booked for active projects.",
        )


class BookingConsentRequiredError(HTTPException):
    """Buyer must have given consent to contact before booking a site visit."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Consent to contact is required before booking a site visit.",
        )


class BookingOwnershipError(HTTPException):
    """The caller does not own the lead or is not permitted to book on its behalf."""

    def __init__(
        self,
        message: str = "You do not have permission to book a visit for this lead.",
    ) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=message,
        )


class MismatchedProjectError(HTTPException):
    """The lead and visit slot belong to different projects."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The specified lead and visit slot belong to different projects.",
        )


class InvalidBookingStatusTransitionError(HTTPException):
    """The requested status transition violates the booking lifecycle."""

    def __init__(self, current_status: str, requested_status: str) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot transition booking from {current_status} to {requested_status}.",
        )

