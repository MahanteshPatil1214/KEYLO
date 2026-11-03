"""Centralised API exception handling and the consistent error envelope."""

from __future__ import annotations

import logging
from http import HTTPStatus
from typing import Any, Mapping

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

_HTTP_ERROR_CODES: dict[int, str] = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
    422: "VALIDATION_ERROR",
    429: "RATE_LIMITED",
    500: "INTERNAL_ERROR",
    503: "SERVICE_UNAVAILABLE",
}


def _error_code_for_status(status_code: int) -> str:
    return _HTTP_ERROR_CODES.get(status_code, "HTTP_ERROR")


def _default_message_for_status(status_code: int) -> str:
    try:
        return HTTPStatus(status_code).phrase
    except ValueError:
        return "Request failed"


def build_error_response(
    *,
    status_code: int,
    code: str,
    message: str,
    details: list[Any] | None = None,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    """Create a JSON error response with the shared Keylo error envelope."""

    return JSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "error": {
                "code": code,
                "message": message,
                "details": details or [],
            },
        },
        headers=dict(headers) if headers else None,
    )


async def http_exception_handler(
    request: Request, exc: StarletteHTTPException
) -> JSONResponse:
    """Handle FastAPI/Starlette HTTP exceptions without leaking internals."""

    message = _default_message_for_status(exc.status_code)
    details: list[Any] = []

    if isinstance(exc.detail, str) and exc.detail:
        message = exc.detail
    elif exc.detail is not None:
        details = [exc.detail]

    if exc.status_code >= 500:
        logger.error(
            "HTTP error while processing %s %s: status=%s",
            request.method,
            request.url.path,
            exc.status_code,
        )

    return build_error_response(
        status_code=exc.status_code,
        code=_error_code_for_status(exc.status_code),
        message=message,
        details=details,
        headers=exc.headers,
    )


async def validation_exception_handler(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    """Return field-level validation errors in the shared error envelope."""

    details: list[dict[str, str]] = []
    for error in exc.errors():
        location = ".".join(
            str(part) for part in error.get("loc", ()) if part != "body"
        )
        details.append(
            {
                "field": location or "request",
                "message": error.get("msg", "Invalid value."),
                "type": error.get("type", "value_error"),
            }
        )

    return build_error_response(
        status_code=422,
        code="VALIDATION_ERROR",
        message="Request validation failed",
        details=details,
    )


async def unhandled_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    """Log unexpected failures and return a safe generic response."""

    logger.error(
        "Unhandled exception while processing %s %s",
        request.method,
        request.url.path,
        exc_info=exc,
    )
    return build_error_response(
        status_code=500,
        code="INTERNAL_ERROR",
        message="An unexpected error occurred",
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Attach all application exception handlers to ``app``."""

    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, unhandled_exception_handler)
