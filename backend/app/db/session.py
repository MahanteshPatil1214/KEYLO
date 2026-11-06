"""Synchronous SQLAlchemy engine, session factory, and FastAPI dependency."""

from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

_settings = get_settings()
_db_url = _settings.database_url.get_secret_value()

# Small-application pool settings. ``pool_pre_ping`` avoids handing out stale
# connections after PostgreSQL restarts or network interruptions.
if _db_url.startswith("sqlite"):
    engine = create_engine(
        _db_url,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        _db_url,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_recycle=1800,
    )

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


def get_db() -> Generator[Session, None, None]:
    """Provide a request-scoped session and guarantee cleanup.

    Routes own their transactions. If a route raises, the session is rolled
    back before being closed; otherwise ``close()`` releases the connection.
    """

    session = SessionLocal()
    try:
        yield session
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def dispose_engine() -> None:
    """Release pooled database connections during application shutdown."""

    engine.dispose()
