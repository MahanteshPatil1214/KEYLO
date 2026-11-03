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

**Module 0 — Backend Foundation** and **Module 1 — Authentication & User
Management** are implemented.

Module 0 provides the shared infrastructure:

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

Module 1 adds:

- UUID-based `roles` and `users` tables with an Alembic migration.
- Idempotent seeding of `BUYER`, `SALES_EXECUTIVE`, and `ADMIN` roles.
- Buyer-only public registration with Argon2 password hashing.
- JWT access-token login and authenticated current-user resolution.
- Reusable role-authorization dependencies.
- Self-service profile reads/updates and admin user management.
- Account activation/deactivation with immediate token rejection.
- Integration and security tests for authentication and authorization.

Lead, conversation, AI, booking, handoff, notification, and dashboard modules
are not implemented yet.

## Technology stack

| Layer | Technology |
| --- | --- |
| Backend | Python 3.11+ (tested with Python 3.13.3) and FastAPI |
| Database | PostgreSQL 16 |
| ORM | SQLAlchemy 2.0 (synchronous) |
| Migrations | Alembic |
| Configuration | Pydantic v2 and pydantic-settings |
| Authentication | Argon2 password hashing and JWT access tokens |
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
│   │   ├── modules/
│   │   │   ├── auth/
│   │   │   │   ├── router.py
│   │   │   │   ├── service.py
│   │   │   │   ├── schemas.py
│   │   │   │   ├── dependencies.py
│   │   │   │   ├── security.py
│   │   │   │   └── exceptions.py
│   │   │   └── users/
│   │   │       ├── router.py
│   │   │       ├── service.py
│   │   │       ├── repository.py
│   │   │       ├── models.py
│   │   │       ├── schemas.py
│   │   │       └── exceptions.py
│   │   └── api/v1/
│   │       ├── router.py
│   │       └── endpoints/health.py
│   ├── alembic/
│   │   ├── env.py
│   │   └── versions/
│   ├── scripts/
│   │   ├── seed_roles.py
│   │   └── create_admin.py
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
| `JWT_SECRET_KEY` | JWT signing secret, at least 32 characters (**required**) | Placeholder in `.env.example` |
| `JWT_ALGORITHM` | `HS256`, `HS384`, or `HS512` | `HS256` |
| `JWT_ISSUER` | Issuer claim validated on every token | `keylo-api` |
| `JWT_AUDIENCE` | Audience claim validated on every token | `keylo-clients` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access-token lifetime in minutes | `30` |
| `POSTGRES_DB` | Compose database name | `keylo_db` |
| `POSTGRES_USER` | Compose database user | `keylo` |
| `POSTGRES_PASSWORD` | Compose database password (**required**) | Placeholder |
| `POSTGRES_PORT` | Host port mapped to PostgreSQL | `5432` |

`DATABASE_URL` and `JWT_SECRET_KEY` are stored as `SecretStr` values, masked in
settings representations, and are never logged.

Generate a local JWT secret instead of using the placeholder:

```powershell
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Production configuration is validated at startup. Production requires
`DEBUG=false`, a PostgreSQL `DATABASE_URL`, an explicitly configured, non-empty
`CORS_ALLOWED_ORIGINS` list containing no wildcard origins, and a JWT secret of
at least 32 characters that is not a development placeholder. The development
CORS and JWT defaults are not accepted as a production configuration.

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
(the Compose project is named `keylo`). Compose starts PostgreSQL only; the API
runs directly under Uvicorn.

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
# Apply all known revisions.
alembic upgrade head

# Show the current revision.
alembic current

# Confirm that Base.metadata matches the database schema.
alembic check
```

Module 1 adds the first revision, which creates the `roles` and `users` tables.
When a later module adds models:

1. Import its model module in `backend/alembic/env.py` so tables register on
   `Base.metadata`.
2. Generate a migration:
   ```powershell
   alembic revision --autogenerate -m "describe the change"
   ```
3. Review the generated file in `alembic/versions/`.
4. Apply it with `alembic upgrade head`.

After the first upgrade, seed the built-in roles:

```powershell
python -m scripts.seed_roles
```

The command is idempotent and can be run again safely.

## Start the API

With PostgreSQL running, migrations applied, and roles seeded:

```powershell
cd E:\KEYLO\backend
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API root: <http://127.0.0.1:8000/>
- Swagger UI: <http://127.0.0.1:8000/docs>
- OpenAPI document: <http://127.0.0.1:8000/openapi.json>

The server refuses to start if required configuration such as `DATABASE_URL`
or `JWT_SECRET_KEY` is missing. Startup and shutdown are logged; database URLs,
credentials, passwords, and tokens are never logged.

## Authentication flow

1. A public client registers through `POST /api/v1/auth/register`. The request
   cannot select a role; every public registration is created as `BUYER`.
2. The password must be 12–128 characters and include uppercase, lowercase,
   numeric, and special characters. It is hashed with Argon2. Plain-text
   passwords and password hashes are never returned by the API.
3. `POST /api/v1/auth/login` accepts email and password. The server returns a
   signed JWT access token with an expiry controlled by
   `ACCESS_TOKEN_EXPIRE_MINUTES`. Login errors are intentionally identical for
   unknown emails, wrong passwords, and inactive accounts.
4. The client sends `Authorization: Bearer <token>` on protected requests.
   The backend verifies the signature, issuer, audience, expiry, token type,
   and subject, then loads the current user and their current database role.
5. `GET /api/v1/auth/me` returns the caller's safe profile.
6. Administrators can list and manage users. Authorization is enforced in the
   backend even if a frontend hides controls.

Role changes and account status changes are read from the database on every
request, so an existing token cannot preserve a revoked role or an inactive
account.

### Calling protected endpoints

Copy the `access_token` value from the login response and send it exactly once
after `Bearer`:

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

Common causes of an immediate `401 Invalid or expired access token`:

- Sending `Authorization: Bearer Bearer <token>`; the token already needs only
  one `Bearer ` prefix.
- Sending the raw token without the `Authorization: Bearer ` header.
- Using the `id` or another field from the registration response instead of the
  `access_token` from login. Registration does not issue a token.
- Reusing a token after `JWT_SECRET_KEY` changed or the application restarted
  with a different `.env`.
- Waiting longer than `ACCESS_TOKEN_EXPIRE_MINUTES` (30 minutes by default).

In Swagger UI, click **Authorize**, paste only the token value into the field
(do not type `Bearer `), and then call `GET /api/v1/auth/me`. In Postman, select
**Authorization → Bearer Token** and paste only the token value. In PowerShell:

```powershell
$me = Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/api/v1/auth/me `
  -Headers @{ Authorization = "Bearer $($tokenResponse.access_token)" }

$me
```

A `401` means the token is missing, malformed, expired, signed with another
secret, or belongs to a deleted user. A `403 This account is inactive` means
the account was deactivated after the token was issued.

### Roles and the first administrator

The three built-in roles are created by:

```powershell
python -m scripts.seed_roles
```

Create the first administrator through a trusted local process. The script
prompts for the email, full name, and password, and never creates a default
account or hardcoded password:

```powershell
python -m scripts.create_admin
```

For automated deployment, provide `KEYLO_ADMIN_EMAIL`,
`KEYLO_ADMIN_FULL_NAME`, and `KEYLO_ADMIN_PASSWORD` through the deployment's
secret environment. The password is validated with the same policy as public
registration. The script refuses to create a duplicate account.

There is no public admin registration endpoint.

## API endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Basic application information |
| `GET` | `/api/v1/health` | Public | Liveness; process is running |
| `GET` | `/api/v1/health/ready` | Public | Readiness; `SELECT 1` against PostgreSQL |
| `POST` | `/api/v1/auth/register` | Public | Register a `BUYER` account |
| `POST` | `/api/v1/auth/login` | Public | Authenticate and receive a JWT access token |
| `GET` | `/api/v1/auth/me` | Authenticated | Current user's profile |
| `GET` | `/api/v1/users` | Admin | Paginated user listing |
| `GET` | `/api/v1/users/{user_id}` | Self or admin | User profile |
| `PATCH` | `/api/v1/users/{user_id}` | Self or admin | Update permitted profile fields |
| `PATCH` | `/api/v1/users/{user_id}/status` | Admin | Activate or deactivate an account |
| `GET` | `/docs` | Public | Swagger UI |

### Example registration

```powershell
$register = @{
  full_name = "Example Buyer"
  email = "buyer@example.com"
  password = "<your-strong-password>"
  phone = "+91 90000 00000"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/api/v1/auth/register `
  -ContentType application/json `
  -Body $register
```

Example response (HTTP `201`):

```json
{
  "id": "d4e7f4f5-6a10-4d17-9c5c-1d8de7f8a7b0",
  "full_name": "Example Buyer",
  "email": "buyer@example.com",
  "phone": "+91 90000 00000",
  "role": {
    "id": "0caa1de7-04d5-4df5-99ab-4595cc5b4e9f",
    "name": "BUYER",
    "description": "Buyer account"
  },
  "is_active": true,
  "is_verified": false,
  "created_at": "2026-11-03T10:00:00Z",
  "updated_at": "2026-11-03T10:00:00Z"
}
```

### Example login

```powershell
$login = @{
  email = "buyer@example.com"
  password = "<your-strong-password>"
} | ConvertTo-Json

$tokenResponse = Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/api/v1/auth/login `
  -ContentType application/json `
  -Body $login

$headers = @{ Authorization = "Bearer $($tokenResponse.access_token)" }
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/v1/auth/me -Headers $headers
```

Example login response:

```json
{
  "access_token": "<signed JWT>",
  "token_type": "bearer",
  "expires_in": 1800
}
```

### Example admin user listing

```powershell
Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/v1/users?page=1&page_size=20" `
  -Headers $headers
```

Pagination returns `items`, `total`, `page`, `page_size`, and `pages`.

### Example profile update

```powershell
Invoke-RestMethod -Method Patch `
  -Uri http://127.0.0.1:8000/api/v1/users/<user-id> `
  -Headers $headers `
  -ContentType application/json `
  -Body (@{ full_name = "Updated Buyer"; phone = "+91 98888 77777" } | ConvertTo-Json)
```

Public registration rejects extra fields such as `role`. A non-admin cannot
change any user's role, and no user can change their own role through this
endpoint. Only admins can change account status.

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
pytest tests/integration/test_auth.py
pytest tests/integration/test_users.py
pytest tests/integration/test_authorization.py
pytest -k health
```

The suite:

- Forces `ENVIRONMENT=testing`, dedicated test database/JWT values before
  importing the application, so it cannot silently use a developer's `.env`.
- Uses a fresh in-memory SQLite engine and FastAPI dependency overrides for each
  database-backed test.
- Seeds roles only inside the isolated test database.
- Never requires the Compose database to be running.
- Covers configuration validation, health checks, error envelopes, CORS,
  logging, session cleanup, registration, duplicate/invalid registration,
  password policy and hashing, login, inactive accounts, expired/invalid
  tokens, role authorization, self-escalation, profile updates, pagination,
  user listing, and account status changes.

## Manual verification performed

Modules 0 and 1 were verified with:

```text
docker compose up -d db        -> PostgreSQL 16 healthy
alembic upgrade head           -> 692d4e5b740f applied
alembic check                  -> No new upgrade operations detected.
python -m scripts.seed_roles   -> roles created, then idempotent on re-run
uvicorn app.main:app           -> application started
GET /                          -> 200 application information
GET /api/v1/health             -> 200 liveness
GET /api/v1/health/ready       -> 200 database ready
POST /api/v1/auth/register     -> 201 buyer account
POST /api/v1/auth/login        -> 200 bearer access token
GET /api/v1/auth/me            -> 200 authenticated profile
GET /api/v1/users              -> 403 for buyer, 200 for admin
pytest                         -> 72 passed
```

The automated suite uses SQLite for deterministic isolation; the live manual
check exercised the PostgreSQL migration and endpoints.

## Engineering notes and limitations

- The database layer is deliberately **synchronous**; async and sync SQLAlchemy
  patterns are not mixed.
- Module 1 implements access tokens only. Refresh tokens, server-side logout,
  and token revocation lists are intentionally out of scope. Clients log out by
  discarding the access token; administrators can terminate access immediately
  by deactivating the account.
- There is no email-verification or password-reset workflow yet. Public accounts
  therefore remain `is_verified=false`; the field is reserved for a future real
  verification mechanism.
- Role changes are performed by admins through `PATCH /api/v1/users/{user_id}`.
  Dedicated role CRUD endpoints are not implemented because the three roles are
  fixed for the MVP.
- Account deletion is not implemented. Deactivation preserves user records for
  future audit and business references.
- Tests use SQLite for isolation; the live manual check exercised PostgreSQL.
- Docker Compose starts PostgreSQL only. Containerising the API and frontend is
  outside the current module scope.
- Logging is JSON to stdout with no rotation, aggregation, or request-ID
  middleware yet.
- No metrics, tracing, rate limiting, or audit dashboard are included yet.
- Production secrets should be supplied by the deployment environment or a
  secrets manager, never committed.
