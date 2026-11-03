"""Centralised, structured application logging."""

from __future__ import annotations

import json
import logging
import sys
from datetime import UTC, datetime

from app.core.config import Settings

_KEYLO_HANDLER_ATTRIBUTE = "_keylo_handler"


class JsonFormatter(logging.Formatter):
    """Render log records as one JSON object per line."""

    def format(self, record: logging.LogRecord) -> str:
        payload: dict[str, object] = {
            "timestamp": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=True)


def configure_logging(settings: Settings) -> None:
    """Configure root logging exactly once per process."""

    level = (
        logging.DEBUG
        if settings.debug
        else getattr(logging, settings.log_level, logging.INFO)
    )
    root_logger = logging.getLogger()
    root_logger.setLevel(level)

    handler = next(
        (
            existing
            for existing in root_logger.handlers
            if getattr(existing, _KEYLO_HANDLER_ATTRIBUTE, False)
        ),
        None,
    )
    if handler is None:
        handler = logging.StreamHandler(sys.stdout)
        setattr(handler, _KEYLO_HANDLER_ATTRIBUTE, True)
        root_logger.addHandler(handler)

    handler.setLevel(level)
    handler.setFormatter(JsonFormatter())

    # SQL statement/parameter logging can expose buyer data; keep it off unless
    # explicitly requested by a future debugging facility.
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
