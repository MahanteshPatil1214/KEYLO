"""HTTP exceptions raised by the dashboard module."""

from __future__ import annotations

from fastapi import HTTPException, status


class MarketingSpendNotFoundError(HTTPException):
    """The requested marketing spend record does not exist."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Marketing spend record not found.",
        )


class InvalidMarketingSpendPeriodError(HTTPException):
    """The effective marketing spend period is not a valid date range."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="period_start must not be after period_end.",
        )
