# Keylo Backend

Backend for Keylo, an AI-powered real-estate lead-response and site-visit
booking assistant. The architecture is a FastAPI modular monolith with
PostgreSQL, SQLAlchemy 2.0, Alembic, Pydantic v2, Argon2, and JWT.

This directory currently implements:

- **Module 0: Backend Foundation** — app factory, configuration, database
  sessions, Alembic, logging, error envelope, health checks, CORS, tests.
- **Module 1: Authentication & User Management** — roles, users, buyer
  registration, login, JWT access tokens, current-user dependencies,
  role-based authorization, profile updates, and admin user management.

See the [repository README](../README.md) for the full project overview,
architecture, API examples, and security notes.

## Quick start (Windows PowerShell)

```powershell
cd E:\KEYLO\backend

python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements-dev.txt

Copy-Item .env.example .env
# Edit .env:
# - use the same strong local password in POSTGRES_PASSWORD and DATABASE_URL
# - replace JWT_SECRET_KEY with:
#   python -c "import secrets; print(secrets.token_urlsafe(64))"

docker compose up -d db
alembic upgrade head
python -m scripts.seed_roles

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Linux/macOS uses `python3 -m venv .venv`, `source .venv/bin/activate`, and
`cp .env.example .env` instead.

## Configuration

Settings are loaded from environment variables and `backend/.env` by
`app/core/config.py`. `DATABASE_URL` and `JWT_SECRET_KEY` are required;
`.env.example` contains placeholders only.

Authentication-related variables:

| Variable | Purpose | Default |
| --- | --- | --- |
| `JWT_SECRET_KEY` | Symmetric JWT signing secret, at least 32 characters | Required |
| `JWT_ALGORITHM` | `HS256`, `HS384`, or `HS512` | `HS256` |
| `JWT_ISSUER` | Validated `iss` claim | `keylo-api` |
| `JWT_AUDIENCE` | Validated `aud` claim | `keylo-clients` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access-token lifetime | `30` |

Production startup validation requires:

- `ENVIRONMENT=production`
- `DEBUG=false`
- a PostgreSQL `DATABASE_URL`
- `CORS_ALLOWED_ORIGINS` explicitly set to one or more non-wildcard origins
- a non-placeholder `JWT_SECRET_KEY` of at least 32 characters

Database and JWT secrets are held in `SecretStr` values and are never logged.

## Migrations and role seeding

```powershell
alembic upgrade head
alembic current
alembic check
python -m scripts.seed_roles
```

The first revision creates `roles` and `users`. The role seed creates `BUYER`,
`SALES_EXECUTIVE`, and `ADMIN`, and is safe to run repeatedly.

`alembic/env.py` imports the Module 1 models so autogeneration can see them.
Future model modules must also be imported there before creating a migration.

## First administrator

There is no default admin account and no public admin registration. Create the
first administrator through a trusted local process:

```powershell
python -m scripts.create_admin
```

The script prompts for email, full name, and password, applies the same password
policy as registration, and refuses duplicate emails. For automated deployment,
set `KEYLO_ADMIN_EMAIL`, `KEYLO_ADMIN_FULL_NAME`, and `KEYLO_ADMIN_PASSWORD` in a
secure environment.

## Authentication flow

1. `POST /api/v1/auth/register` creates a `BUYER` account. Extra fields such as
   `role` are rejected.
2. Passwords are hashed with Argon2; plain-text passwords and hashes are never
   returned.
3. `POST /api/v1/auth/login` returns a signed JWT access token.
4. Protected requests use `Authorization: Bearer <token>`.
5. The backend validates the signature, issuer, audience, expiry, token type,
   and subject, loads the user, and rejects inactive accounts.
6. Roles are read from the database on every request, so revoked roles and
   deactivated accounts take effect immediately.
7. `GET /api/v1/auth/me` returns the current safe profile.

Login errors are identical for unknown emails, wrong passwords, and inactive
accounts to avoid email enumeration.

Send the token exactly as:

```text
Authorization: Bearer <access_token>
```

In Swagger UI, click **Authorize** and paste only the `access_token` value — do
not include the `Bearer ` prefix there. In Postman, use **Authorization →
Bearer Token** and paste only the token value.

An immediate `401 Invalid or expired access token` usually means the header
contains `Bearer Bearer <token>`, the raw token was sent without the
`Authorization: Bearer ` prefix, a registration `id` was used instead of the
login `access_token`, or the token was signed with a different `JWT_SECRET_KEY`
after restarting with another `.env`. Tokens also expire after
`ACCESS_TOKEN_EXPIRE_MINUTES` (30 minutes by default).

## API endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/` | Public | Basic application information |
| `GET` | `/api/v1/health` | Public | Liveness |
| `GET` | `/api/v1/health/ready` | Public | Readiness (`SELECT 1`) |
| `POST` | `/api/v1/auth/register` | Public | Register a buyer |
| `POST` | `/api/v1/auth/login` | Public | Receive an access token |
| `GET` | `/api/v1/auth/me` | Authenticated | Current profile |
| `GET` | `/api/v1/users` | Admin | Paginated user listing |
| `GET` | `/api/v1/users/{user_id}` | Self or admin | User profile |
| `PATCH` | `/api/v1/users/{user_id}` | Self or admin | Update permitted fields |
| `PATCH` | `/api/v1/users/{user_id}/status` | Admin | Activate/deactivate account |
| `GET` | `/docs` | Public | Swagger UI |

Example registration:

```powershell
$body = @{
  full_name = "Example Buyer"
  email = "buyer@example.com"
  password = "<your-strong-password>"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/api/v1/auth/register `
  -ContentType application/json `
  -Body $body
```

Example login:

```powershell
$body = @{
  email = "buyer@example.com"
  password = "<your-strong-password>"
} | ConvertTo-Json

$token = Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/api/v1/auth/login `
  -ContentType application/json `
  -Body $body

Invoke-RestMethod `
  -Uri http://127.0.0.1:8000/api/v1/auth/me `
  -Headers @{ Authorization = "Bearer $($token.access_token)" }
```

Errors use the shared envelope:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": []
  }
}
```

## Tests

```powershell
pytest
```

Useful variants:

```powershell
pytest -q
pytest tests/unit
pytest tests/integration
pytest tests/integration/test_auth.py
pytest tests/integration/test_authorization.py
pytest tests/integration/test_users.py
```

The suite forces testing configuration before importing the app, uses a fresh
in-memory SQLite database with dependency overrides, seeds roles only in the
isolated test database, and never connects to the developer or production
database. PostgreSQL migrations and live endpoints are verified separately.

## Layout

```text
app/
├── main.py                 FastAPI factory, root endpoint, lifespan
├── core/                   Settings, logging, exception handling
├── db/                     Declarative Base, engine, sessions, get_db
├── api/v1/                 Versioned router and health endpoints
└── modules/
    ├── auth/               JWT/password security, login, dependencies, router
    └── users/              Roles/users models, repository, service, router
alembic/                    Migration environment and versions
scripts/                    Role seeding and first-admin provisioning
tests/                      Unit and integration tests
docker-compose.yml          PostgreSQL 16 with a persistent volume
```

## Limitations

- Access tokens only: no refresh tokens, server-side logout, or revocation list.
  Logout is client-side; deactivation immediately blocks account access.
- No email verification or password reset yet. Public users remain
  `is_verified=false`.
- The three roles are fixed for the MVP; role CRUD is not exposed.
- Account deletion is not implemented; deactivation is used instead.
- Synchronous database access by design.
- Docker Compose provides PostgreSQL only; the API runs under Uvicorn.
- Tests use SQLite; PostgreSQL connectivity and migrations are verified manually.
- No log rotation, metrics, tracing, or rate limiting yet.
