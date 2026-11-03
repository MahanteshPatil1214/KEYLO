"""Database session lifecycle tests."""

from __future__ import annotations

from collections.abc import Generator

import pytest
from sqlalchemy import text
from sqlalchemy.orm import Session, sessionmaker

from app.db import session as session_module


class SpySession:
    """Minimal session stand-in that records cleanup calls."""

    def __init__(self) -> None:
        self.closed = False
        self.rolled_back = False

    def close(self) -> None:
        self.closed = True

    def rollback(self) -> None:
        self.rolled_back = True


def test_get_db_yields_and_closes_session(monkeypatch: pytest.MonkeyPatch) -> None:
    spy = SpySession()
    monkeypatch.setattr(session_module, "SessionLocal", lambda: spy)

    dependency: Generator[Session, None, None] = session_module.get_db()
    assert next(dependency) is spy

    with pytest.raises(StopIteration):
        next(dependency)

    assert spy.closed is True
    assert spy.rolled_back is False


def test_get_db_rolls_back_and_closes_on_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    spy = SpySession()
    monkeypatch.setattr(session_module, "SessionLocal", lambda: spy)

    dependency: Generator[Session, None, None] = session_module.get_db()
    assert next(dependency) is spy

    with pytest.raises(RuntimeError, match="route failed"):
        dependency.throw(RuntimeError("route failed"))

    assert spy.rolled_back is True
    assert spy.closed is True


def test_test_session_can_execute_select_one(
    test_session_factory: sessionmaker[Session],
) -> None:
    with test_session_factory() as session:
        assert session.execute(text("SELECT 1")).scalar_one() == 1
