"""Logging configuration tests."""

from __future__ import annotations

import logging

from app.core.config import Settings
from app.core.logging import JsonFormatter, configure_logging


def test_logging_configuration_is_idempotent(test_settings: Settings) -> None:
    configure_logging(test_settings)
    configure_logging(test_settings)

    keylo_handlers = [
        handler
        for handler in logging.getLogger().handlers
        if getattr(handler, "_keylo_handler", False)
    ]

    assert len(keylo_handlers) == 1
    assert isinstance(keylo_handlers[0].formatter, JsonFormatter)
    assert logging.getLogger().level == logging.WARNING
