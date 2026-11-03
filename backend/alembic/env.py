"""Alembic environment configuration.

The database URL is read from the application settings rather than committed
to ``alembic.ini``. Future modules only need to import their model modules in
this file so that their tables are registered on ``Base.metadata``.
"""

from __future__ import annotations

import logging
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.core.config import get_settings
from app.db.base import Base
from app.modules.leads import models as leads_models  # noqa: F401
from app.modules.projects import models as projects_models  # noqa: F401
from app.modules.users import models  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

logger = logging.getLogger("alembic.env")

settings = get_settings()
target_metadata = Base.metadata

# Future model modules must be imported above so Alembic can autogenerate
# their tables. Module 1, Module 2, and Module 3 models are imported
# immediately after ``Base``.


def _database_url() -> str:
    return settings.database_url.get_secret_value()


def run_migrations_offline() -> None:
    """Run migrations without creating a database connection."""

    context.configure(
        url=_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        compare_server_default=True,
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live database connection."""

    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = _database_url()

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            compare_type=True,
            compare_server_default=True,
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
