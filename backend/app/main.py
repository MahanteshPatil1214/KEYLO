"""FastAPI application factory and root endpoint."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Literal

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from app.api.v1.router import api_router
from app.core.config import Settings, get_settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.db.session import dispose_engine

logger = logging.getLogger(__name__)


class RootResponse(BaseModel):
    """Basic, non-sensitive application information."""

    status: Literal["ok"] = "ok"
    name: str
    environment: str
    api_version: str
    api_prefix: str
    docs_url: str


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build and configure the Keylo FastAPI application."""

    app_settings = settings or get_settings()
    configure_logging(app_settings)

    @asynccontextmanager
    async def lifespan(_: FastAPI) -> AsyncIterator[None]:
        logger.info(
            "Starting %s (environment=%s, api_version=%s, debug=%s)",
            app_settings.app_name,
            app_settings.environment,
            app_settings.api_version,
            app_settings.debug,
        )
        if (
            getattr(app_settings, "reminder_scheduler_enabled", True)
            and app_settings.environment not in ("test", "testing")
        ):
            from app.modules.notifications.scheduler import reminder_scheduler

            reminder_scheduler.start()

        yield

        logger.info("Shutting down %s", app_settings.app_name)
        if (
            getattr(app_settings, "reminder_scheduler_enabled", True)
            and app_settings.environment not in ("test", "testing")
        ):
            from app.modules.notifications.scheduler import reminder_scheduler

            await reminder_scheduler.stop()

        dispose_engine()

    application = FastAPI(
        title=app_settings.app_name,
        description="Keylo real-estate lead-response and site-visit booking API.",
        version=app_settings.api_version,
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url=None,
        openapi_url="/openapi.json",
        # Keylo always returns its JSON error envelope. FastAPI's debug mode
        # would return HTML tracebacks for unexpected errors instead.
        debug=False,
    )
    application.state.settings = app_settings

    register_exception_handlers(application)

    application.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.cors_allowed_origins,
        allow_credentials="*" not in app_settings.cors_allowed_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    application.include_router(api_router, prefix=app_settings.api_v1_prefix)

    @application.get(
        "/",
        response_model=RootResponse,
        tags=["root"],
        summary="Application information",
    )
    def root() -> RootResponse:
        """Return basic application information for clients and operators."""

        return RootResponse(
            name=app_settings.app_name,
            environment=app_settings.environment,
            api_version=app_settings.api_version,
            api_prefix=app_settings.api_v1_prefix,
            docs_url="/docs",
        )

    return application


app = create_app()
