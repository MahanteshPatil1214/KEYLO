"""Liveness and readiness endpoints."""

from __future__ import annotations

import logging
from typing import Literal

from fastapi import APIRouter, Depends, Response, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.config import Settings, get_settings
from app.db.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter()


class LivenessResponse(BaseModel):
    """Response returned when the application process is running."""

    status: Literal["ok"] = "ok"
    service: str
    environment: str


class ReadinessResponse(BaseModel):
    """Response returned after checking required dependencies."""

    status: Literal["ready", "not_ready"]
    checks: dict[str, str]


@router.get("", response_model=LivenessResponse, summary="Liveness check")
def liveness(settings: Settings = Depends(get_settings)) -> LivenessResponse:
    """Report that the API process is running."""

    return LivenessResponse(
        status="ok",
        service=settings.app_name,
        environment=settings.environment,
    )


@router.get(
    "/ready",
    response_model=ReadinessResponse,
    summary="Readiness check",
    responses={
        status.HTTP_503_SERVICE_UNAVAILABLE: {
            "model": ReadinessResponse,
            "description": "A required dependency is unavailable.",
        }
    },
)
def readiness(
    response: Response,
    db: Session = Depends(get_db),
) -> ReadinessResponse:
    """Report whether the API can reach PostgreSQL.

    The response never includes connection strings, driver errors, or other
    infrastructure details.
    """

    try:
        db.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:
        logger.warning(
            "Readiness check failed: database is unavailable (%s)",
            type(exc).__name__,
        )
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE
        return ReadinessResponse(
            status="not_ready",
            checks={"database": "unavailable"},
        )

    return ReadinessResponse(status="ready", checks={"database": "ok"})
