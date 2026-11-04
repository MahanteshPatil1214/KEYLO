"""Availability and site-visit booking module."""

from __future__ import annotations

from app.modules.bookings.router import bookings_router, slots_router

__all__ = [
    "bookings_router",
    "slots_router",
]

