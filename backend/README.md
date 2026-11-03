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
- **Module 2: Projects & Fact Sheets** — projects, draft/approved facts, staged
  approved-fact edits, approval/rejection, answer version history, role-aware
  reads, and the AI-safe approved-facts retrieval boundary.

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

The first revision creates `roles` and `users`; the second creates `projects`,
`project_facts`, and `fact_versions`, including status checks, foreign keys,
unique slug, unique per-fact version numbers, and query indexes. The role seed
creates `BUYER`, `SALES_EXECUTIVE`, and `ADMIN`, and is safe to run repeatedly.

`alembic/env.py` imports the Module 1 and Module 2 models so autogeneration can
see them. Future model modules must also be imported there before creating a
migration.

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
| `POST` | `/api/v1/projects` | Admin | Create a project |
| `GET` | `/api/v1/projects` | Authenticated | Paginated project listing |
| `GET` | `/api/v1/projects/{project_id}` | Authenticated | Project detail |
| `PATCH` | `/api/v1/projects/{project_id}` | Admin | Update details/status |
| `POST` | `/api/v1/projects/{project_id}/facts` | Admin | Create a draft fact |
| `GET` | `/api/v1/projects/{project_id}/facts` | Authenticated | Paginated fact listing |
| `GET` | `/api/v1/facts/{fact_id}` | Authenticated | Fact detail |
| `PATCH` | `/api/v1/facts/{fact_id}` | Admin | Edit/stage a fact change |
| `POST` | `/api/v1/facts/{fact_id}/approve` | Admin | Approve or publish a staged edit |
| `POST` | `/api/v1/facts/{fact_id}/reject` | Admin | Discard a staged edit/unpublish |
| `GET` | `/api/v1/facts/{fact_id}/versions` | Admin | Paginated answer history |
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

## Projects and fact sheets

Projects move through `DRAFT`, `ACTIVE`, and `INACTIVE`. Buyers and sales
executives can read only `ACTIVE` projects. Project writes are admin-only, and
`DRAFT` cannot be re-entered after publication.

Facts start as `DRAFT` and are hidden from non-admin readers. Admins approve
facts before they become eligible for buyer or AI use. Editing an approved fact
stages the proposed category, question, and answer in `pending_*` fields; the
previously approved content remains visible until an admin approves the staged
edit. Rejecting a staged edit discards it. Rejecting an approved fact with no
staged edit moves it back to `DRAFT`.

Fact answer history is append-only:

- Version 1 is created with the initial answer (`previous_answer = null`).
- Each canonical answer change appends the next sequential version.
- Category-only or question-only changes do not create duplicate answer
  versions.
- `(fact_id, version_number)` is unique, and updates run in transactions with a
  fact row lock on PostgreSQL.
- `changed_by` records the editor who proposed the published answer.

Future AI code must call the service boundary instead of querying models:

```python
from app.modules.projects.service import get_approved_facts

facts = get_approved_facts(session, project_id, category="LOCATION")
```

It returns only approved facts for an active project and never returns staged
pending content. Listing endpoints support `page` and `page_size`; admins may
filter projects/facts by `status` and facts by `category`.

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
pytest tests/integration/test_projects.py
pytest tests/integration/test_facts.py
```

The suite forces testing configuration before importing the app, uses a fresh
in-memory SQLite database with dependency overrides, seeds roles only in the
isolated test database, and never connects to the developer or production
database. It covers project lifecycle, slug conflicts, fact approval/rejection,
staged approved-fact edits, draft visibility, sequential and deduplicated
version history, role restrictions, and approved-facts retrieval. PostgreSQL
migrations and live endpoints are verified separately.

## Layout

```text
app/
├── main.py                 FastAPI factory, root endpoint, lifespan
├── core/                   Settings, logging, exception handling
├── db/                     Declarative Base, engine, sessions, get_db
├── api/v1/                 Versioned router and health endpoints
└── modules/
    ├── auth/               JWT/password security, login, dependencies, router
    ├── users/              Roles/users models, repository, service, router
    └── projects/           Projects, facts, versions, approval, AI boundary
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
- Project/fact deletion is not implemented; facts are rejected/unpublished
  instead of deleted.
- Fact version history tracks answers only. Category/question changes update the
  fact audit fields but do not create version rows.
- Fact categories are free-form uppercase labels until an agreed allowlist is
  introduced.
- No Groq/AI, lead, conversation, booking, notification, or dashboard module is
  implemented yet; only the approved-facts service boundary exists.
- Synchronous database access by design.
- Docker Compose provides PostgreSQL only; the API runs under Uvicorn.
- Tests use SQLite; PostgreSQL connectivity and migrations are verified manually.
- No log rotation, metrics, tracing, or rate limiting yet.
