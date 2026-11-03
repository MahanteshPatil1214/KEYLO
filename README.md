# Keylo

Keylo is an AI-powered real-estate lead-response and site-visit booking
assistant for a residential developer. Buyers enquire through the web
application, receive fact-grounded answers, share requirements, and book
genuinely available site visits. Serious buyers can be handed off to a named
sales executive with conversation context.

The project follows the definition in [`PROJECT.md`](PROJECT.md): a **modular
monolith** built with FastAPI, PostgreSQL, SQLAlchemy 2.0, Alembic, and Pydantic
v2.

## Current status

**Module 0 — Backend Foundation** is implemented. It provides the shared
backend infrastructure only:

- FastAPI application and versioned `/api/v1` router.
- Environment-based settings with `.env` support.
- PostgreSQL engine, session factory, and request-scoped session dependency.
- Alembic configuration using application settings and `Base.metadata`.
- Centralised JSON exception handling.
- Structured JSON logging with configurable level.
- Liveness and readiness health checks.
- Environment-driven CORS.
- Docker Compose PostgreSQL service.
- Isolated Pytest suite.

No authentication, lead, conversation, AI, booking, handoff, notification, or
dashboard business modules have been implemented yet.

## Technology stack

| Layer | Technology |
| --- | --- |
| Backend | Python 3.11+ (tested with Python 3.13.3) and FastAPI |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy 2.0 (synchronous) |
| Migrations | Alembic |
| Configuration | Pydantic v2 and pydantic-settings |
| Tests | Pytest |
| Local services | Docker Compose |

## Repository layout

```text
KEYLO/
├── PROJECT.md
├── README.md
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── exceptions.py
│   │   │   └── logging.py
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   └── session.py
│   │   └── api/v1/
│   │       ├── router.py
│   │       └── endpoints/health.py
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   ├── scripts/
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── unit/
│   │   └── integration/
│   ├── .env.example
│   ├── alembic.ini
│   ├── docker-compose.yml
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── README.md
├── docs/
└── frontend/
```

## Prerequisites

- **Python 3.11 or newer** with `venv` and `pip`.
- **Docker Desktop** (or Docker Engine) with Docker Compose v2.
- **PowerShell** for the Windows commands below. Linux/macOS equivalents are
  noted where useful.

Verify the tools:

```powershell
python --version
docker --version
docker compose version
```

## Backend setup (Windows PowerShell)

All backend commands below are run from the `backend` directory.

```powershell
cd E:\KEYLO\backend

# Create and activate a virtual environment.
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# If activation is blocked by the execution policy, allow it for this shell:
# Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
```

`requirements-dev.txt` includes the runtime dependencies plus Pytest and the
test HTTP client. Use `requirements.txt` for a runtime-only installation.

Linux/macOS equivalent:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt
```

## Environment configuration

Create a local `.env` from the template:

```powershell
Copy-Item .env.example .env
```

Open `backend/.env` and replace the placeholder password
(`change-me-local-dev`) in **both** `POSTGRES_PASSWORD` and the password portion
of `DATABASE_URL`. They must match. The `backend/.env` file is ignored by Git.
Only `backend/.env.example` with placeholders is committed.

| Variable | Purpose | Development default |
| --- | --- | --- |
| `APP_NAME` | API display name | `Keylo API` |
| `ENVIRONMENT` | `development`, `testing`, or `production` | `development` |
| `API_VERSION` | Version segment such as `v1` | `v1` |
| `DEBUG` | Enable debug-level application logging | `true` |
| `DATABASE_URL` | SQLAlchemy PostgreSQL URL (**required**) | Placeholder in `.env.example` |
| `CORS_ALLOWED_ORIGINS` | JSON list or comma-separated allowed browser origins | Local dev origins |
| `LOG_LEVEL` | `DEBUG`, `INFO`, `WARNING`, `ERROR`, or `CRITICAL` | `INFO` |
| `POSTGRES_DB` | Compose database name | `keylo_db` |
| `POSTGRES_USER` | Compose database user | `keylo` |
| `POSTGRES_PASSWORD` | Compose database password (**required**) | Placeholder |
| `POSTGRES_PORT` | Host port mapped to PostgreSQL | `5432` |

`DATABASE_URL` is stored as a `SecretStr`, masked in settings representations,
and is never logged.

Production configuration is validated at startup. Production requires
`DEBUG=false`, a PostgreSQL `DATABASE_URL`, and an explicitly configured,
non-empty `CORS_ALLOWED_ORIGINS` list containing no wildcard origins. The
development CORS defaults are not accepted as a production configuration.

## Start PostgreSQL

From `backend`, with `backend/.env` configured:

```powershell
docker compose up -d db
docker compose ps
```

The service is healthy when `STATUS` shows `Up ... (healthy)`. Follow logs with:

```powershell
docker compose logs -f db
```

Stop the service without deleting data:

```powershell
docker compose down
```

Delete the database and its named volume when a clean start is needed:

```powershell
docker compose down -v
```

The container stores data in the named volume `keylo_keylo_postgres_data`
(the Compose project is named `keylo`). Only PostgreSQL is started in Module 0;
the API runs directly under Uvicorn.

### Port conflicts

If another PostgreSQL instance already uses host port `5432`, set a different
`POSTGRES_PORT` in `backend/.env` (for example `5433`) **and** update the port in
`DATABASE_URL` to match:

```dotenv
POSTGRES_PORT=5433
DATABASE_URL=postgresql+psycopg2://keylo:your-local-password@localhost:5433/keylo_db
```

Then run `docker compose up -d db` again.

## Database migrations

Alembic reads `DATABASE_URL` from the application settings in
`alembic/env.py`. The URL is not duplicated in `alembic.ini`.

```powershell
# Apply all known revisions. Module 0 intentionally has no revisions yet.
alembic upgrade head

# Show the current revision (empty until the first migration is created).
alembic current

# Confirm that Base.metadata matches the database schema.
alembic check
```

When the first business module adds models:

1. Import its model module in `backend/alembic/env.py` so tables register on
   `Base.metadata`.
2. Generate a migration:
   ```powershell
   alembic revision --autogenerate -m "describe the change"
   ```
3. Review the generated file in `alembic/versions/`.
4. Apply it with `alembic upgrade head`.

No fake or empty business migration was generated for Module 0.

## Start the API

With PostgreSQL running and migrations applied:

```powershell
cd E:\KEYLO\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API root: <http://127.0.0.1:8000/>
- Swagger UI: <http://127.0.0.1:8000/docs>
- OpenAPI document: <http://127.0.0.1:8000/openapi.json>

The server refuses to start if required configuration such as `DATABASE_URL` is
missing. Startup and shutdown are logged; the database URL and credentials are
never logged.

## Health endpoints

### `GET /`

Basic application information.

```json
{
  "status": "ok",
  "name": "Keylo API",
  "environment": "development",
  "api_version": "v1",
  "api_prefix": "/api/v1",
  "docs_url": "/docs"
}
```

### `GET /api/v1/health`

Liveness: confirms the application process is running. It does not touch the
database.

```json
{
  "status": "ok",
  "service": "Keylo API",
  "environment": "development"
}
```

### `GET /api/v1/health/ready`

Readiness: executes `SELECT 1` against PostgreSQL.

Healthy database:

```json
{
  "status": "ready",
  "checks": { "database": "ok" }
}
```

Unavailable database returns HTTP `503`:

```json
{
  "status": "not_ready",
  "checks": { "database": "unavailable" }
}
```

Verify from PowerShell:

```powershell
Invoke-RestMethod http://127.0.0.1:8000/
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health
Invoke-RestMethod http://127.0.0.1:8000/api/v1/health/ready
```

Health responses do not expose credentials, connection URLs, stack traces, or
other infrastructure details.

## Error responses

HTTP exceptions, request validation failures, and unexpected exceptions use one
envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "quantity",
        "message": "Input should be a valid integer",
        "type": "int_parsing"
      }
    ]
  }
}
```

Unexpected exceptions return HTTP `500` with `INTERNAL_ERROR` and a generic
message. Full tracebacks are logged server-side only; request values are not
echoed in validation details. HTTP headers such as `WWW-Authenticate` are
preserved on HTTP error responses.

## CORS

CORS origins come from `CORS_ALLOWED_ORIGINS`. Development defaults allow the
common React/Vite ports. Credentials are enabled only when explicit origins are
configured; a wildcard origin disables credentialed CORS. Production rejects
wildcard origins at startup.

## Logging

Application logs are emitted as one JSON object per line with timestamp, level,
logger name, message, and optional exception text. The level is controlled by
`LOG_LEVEL`; `DEBUG=true` enables debug-level application logging. Password,
token, secret, and buyer data must not be included in log messages.

SQLAlchemy's engine logger is held at `WARNING` so SQL parameters are not logged
by default.

## Run the tests

```powershell
cd E:\KEYLO\backend
.\.venv\Scripts\Activate.ps1
pytest
```

Useful variants:

```powershell
pytest -q
pytest tests/unit
pytest tests/integration
pytest -k health
```

The suite:

- Forces `ENVIRONMENT=testing` and a dedicated test `DATABASE_URL` before
  importing the application, so it cannot silently use a developer's `.env`.
- Uses an in-memory SQLite engine and FastAPI dependency overrides for database
  checks.
- Never requires the Compose database to be running.
- Covers configuration validation, the root endpoint, liveness, readiness,
  readiness failure, error envelopes, CORS, logging setup, and session cleanup.

## Manual verification performed

Module 0 was verified with:

```text
docker compose up -d db        -> PostgreSQL 16 healthy
alembic upgrade head           -> no revisions (expected)
alembic check                  -> No new upgrade operations detected.
uvicorn app.main:app           -> application started
GET /                          -> 200 application information
GET /api/v1/health             -> 200 liveness
GET /api/v1/health/ready       -> 200 database ready
pytest                         -> 30 passed
```

## Engineering notes and limitations

- The database layer is deliberately **synchronous**; async and sync SQLAlchemy
  patterns are not mixed.
- Module 0 has no business tables. `alembic/versions/` is intentionally empty.
- Tests use SQLite for isolation; the live manual check exercised PostgreSQL.
  A PostgreSQL-backed integration test suite can be added when the first real
  schema exists.
- Docker Compose starts PostgreSQL only. Containerising the API, the frontend,
  and future services is out of Module 0 scope.
- Logging is JSON to stdout with no rotation, aggregation, or request-ID
  middleware yet.
- No metrics, tracing, rate limiting, authentication, or authorization are
  included in Module 0.
- Production secrets should be supplied by the deployment environment or a
  secrets manager, never committed.
