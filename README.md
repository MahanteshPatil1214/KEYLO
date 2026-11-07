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

Keylo is a complete full-stack enterprise platform featuring a modular FastAPI backend, PostgreSQL/SQLite database layer with 10 Alembic migrations, and a responsive React 19 / TypeScript / Vite frontend supporting three role-isolated workspaces: **Buyer Portal**, **Sales Workspace**, and **Admin Console**.

### Implemented Backend & Frontend Modules:
- **Module 0 — Backend Foundation**: FastAPI app, versioned `/api/v1` router, structured JSON logging, health checks, error handling, Docker Compose, Pytest harness.
- **Module 1 — Authentication & User Management**: Argon2 password hashing, JWT access tokens, role enforcement (`BUYER`, `SALES_EXECUTIVE`, `ADMIN`), user activation/deactivation.
- **Module 2 — Projects & Fact Sheets**: Project catalog, independently editable fact sheets, draft vs approved states, staged `pending_*` edits, publish governance.
- **Module 3 — Lead Management**: Public enquiry intake, deduplication via PostgreSQL advisory locks, consent enforcement, assignment history, status state machine.
- **Module 4 — Conversations & Messages**: Buyer-sales messaging, chronological history, thread lifecycle status (`ACTIVE`, `CLOSED`, `ARCHIVED`).
- **Module 5 — AI Assistant with Groq**: Grounded strictly in approved fact sheets, multilingual support (English, Hindi, Gujarati), price negotiation refusal, graceful fallbacks.
- **Module 6 — Availability & Site Visit Booking**: Visit slots, transactional row locking preventing double-booking, self-service buyer cancellation, outcome tracking (`COMPLETED`, `NO_SHOW`).
- **Module 7 — Human Handoff**: Explicit requests and automatic handoffs when facts are unavailable, sales executive queues, resolution notes.
- **Module 8 — Notifications & Reminders**: In-app notifications, 24h & 2h site-visit reminder scans, broadcast alerts.
- **Module 9 — Executive Analytics & Reporting**: KPIs (total leads, response times, site visits, conversion rate, show-up rate), marketing spend ROI, executive performance, interactive Bezier spline timeline trends.
- **Module 10 — System Settings & Audit Trail**: Global configuration (reminders, AI settings, multilingual settings, lead routing), notification templates, and immutable audit logs.
- **Frontend Architecture**: React 19, TypeScript, Vite, Tailwind CSS v4, React Router v7, TanStack Query v5, Framer Motion, Lucide icons. Premium collapsible sidebar, responsive drawers, and Keylo luxury real estate design system (`#FAFAF7`, charcoal `#1F2421`, ivory, emerald, amber accents).

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

Module 2 adds:

- UUID-based `projects`, `project_facts`, and `fact_versions` tables with a
  second Alembic migration.
- Admin-only project creation, editing, pagination, and lifecycle transitions.
- Independently editable facts with draft and approved states.
- Safe approved-fact editing through staged `pending_*` content.
- Admin approval and rejection workflows with buyer-visible publish control.
- Append-only, sequential answer history and a paginated version endpoint.
- Role-aware reads that hide drafts from buyers and sales executives.
- An AI-safe `get_approved_facts()` service boundary for future retrieval.

Module 3 adds:

- UUID-based `leads` and `lead_assignments` tables with an Alembic migration.
- Public lead intake endpoint (`POST /api/v1/leads`) with rate limiting and strict privileged-field rejection.
- Active-project validation ensuring enquiries attach only to live projects.
- Normalized contact deduplication (email and phone) with PostgreSQL advisory locks (`pg_advisory_xact_lock`) against concurrent collisions.
- Proactive duplicate-check endpoint for administrators (`GET /api/v1/leads/duplicates/check`).
- Paginated lead listing, search (name, email, phone digits), and multi-field filtering.
- Field privilege separation: sales executives cannot modify administrative fields (`project_id`, `source`).
- Strict lifecycle state machine validation (`NEW`, `CONTACTED`, `QUALIFIED`, `VISIT_BOOKED`, `VISIT_CANCELLED`, `VISITED`, `CONVERTED`, `NOT_INTERESTED`, `LOST`).
- Contact consent enforcement: contact-requiring status transitions and executive assignment require `consent_to_contact: true`.
- Executive assignment and re-assignment with assignment history preservation and database-enforced single active assignment partial unique index.

Module 4 adds:

- UUID-based `conversations` and `messages` tables with an Alembic migration.
- Strict ownership and role-based access isolation: Buyers access only their own threads; Sales Executives access conversations for assigned leads on active projects; Admins access all.
- Conversation initiation endpoint (`POST /api/v1/conversations`) supporting optional initial messages and lead/project relationship verification.
- Sender-type integrity enforcement: Buyers can only send as `BUYER`; Sales Executives can only send as `SALES_EXECUTIVE`; Non-admins cannot forge `ASSISTANT` or other sender roles.
- Safe message posting with non-empty content validation and strict rejection of writes to `CLOSED` or `ARCHIVED` threads.
- Paginated message history retrieval (`GET /api/v1/conversations/{id}/messages`) with chronological (`asc`) and reverse (`desc`) ordering.
- Direct message lookup endpoint (`GET /api/v1/messages/{message_id}`) with conversation visibility checks.
- Conversation lifecycle status management (`ACTIVE`, `CLOSED`, `ARCHIVED`), restricting archive capability to administrators.

Module 5 adds:

- Fact-grounded AI Assistant service powered by the official Groq Python SDK (`openai/gpt-oss-120b`).
- Strict grounding in Module 2 approved facts (`get_approved_facts()`), guaranteeing draft facts and staged pending edits are never seen by the model.
- Robust safety guardrails: zero invented information, refusal to negotiate or quote final prices, and immediate human escalation when requested.
- Conversational memory passing chronological dialogue history into context.
- Multilingual assistance natively supporting English, Hindi, and Gujarati.
- High-resilience chat workflow: buyer messages are persisted and committed before the Groq call, guaranteeing enquiries are never lost during API timeouts, rate limits, or outages.
- Dedicated chat endpoints: `POST /api/v1/conversations/{conversation_id}/chat` and `POST /api/v1/assistant/chat`.

Module 6 adds:

- UUID-based `visit_slots` and `bookings` tables with an Alembic migration (`62cc99aeab0b`).
- Administrative visit slot management (`POST /api/v1/slots`, `PATCH /api/v1/slots/{id}`, `PATCH /api/v1/slots/{id}/deactivate`) with time ordering, future start times, project status verification, and duplicate range rejection (`uq_visit_slots_project_time_range`).
- Real-time availability lookup (`GET /api/v1/slots/available`) dynamically computing remaining capacity (`capacity - active_bookings > 0`) for active projects.
- PostgreSQL-safe concurrency control via transactional row locking (`SELECT ... FOR UPDATE` on `visit_slots`) preventing double-booking and capacity overruns under high concurrent load.
- Partial unique index `uq_bookings_lead_slot_active` ensuring a lead cannot hold multiple simultaneous active bookings on the same slot.
- Automatic lead lifecycle synchronization: `VISIT_BOOKED` on booking creation, `VISIT_CANCELLED` on cancellation (if no active bookings remain), and `VISITED` on visit completion.
- Mandatory contact consent enforcement (`consent_to_contact: true`) before site visit bookings can be created.
- Buyer self-service cancellation endpoint (`POST /api/v1/bookings/{id}/cancel`), immediately restoring slot capacity.
- Strict role-based booking visibility: Buyers view only their own bookings; Sales Executives view bookings only for assigned leads on active projects; Admins view all.
- Visit outcome status management (`PATCH /api/v1/bookings/{id}/status`) restricted to Admins and assigned Sales Executives (`COMPLETED`, `NO_SHOW`).

Module 7 adds:

- UUID-based `handoffs` table with an Alembic migration (`77a9d0f475be`).
- Buyer-initiated escalation endpoints (`POST /api/v1/handoffs` and `POST /api/v1/conversations/{id}/handoff`).
- Automatic conversation flagging by the AI assistant when verified facts are unavailable or fallback responses are triggered.
- Duplicate active handoff prevention at the database level (`uq_handoffs_conversation_active`) and service layer (HTTP `409 Conflict`).
- Automated `SYSTEM` message notifications in the conversation thread via Module 4.
- Admin executive assignment and reassignment endpoint (`POST /api/v1/handoffs/{id}/assign`) restricted to active sales executives.
- Role-based handoff visibility isolation: Sales executives view and manage only handoffs assigned to them; buyers view handoffs for their conversations; admins view all.
- Strictly factual conversation summaries compiled for the sales executive without hallucination.
- Complete lifecycle status management (`PENDING`, `ASSIGNED`, `IN_PROGRESS`, `RESOLVED`, `CANCELLED`) with resolution notes tracking.

Module 8 adds:

- UUID-based `notifications` table with an Alembic migration (`3df128151593`).
- In-app notification creation dispatched from core domain events:
  - New lead assignment to sales executives (`LEAD_ASSIGNED`).
  - New handoff escalation assigned to sales executives (`HANDOFF_ASSIGNED`).
  - Handoff status resolution updates delivered to buyer/creator (`HANDOFF_STATUS_UPDATED`).
  - Site-visit booking confirmations delivered to buyer and assigned executive (`BOOKING_CONFIRMED`).
  - Site-visit booking cancellations delivered to buyer and assigned executive (`BOOKING_CANCELLED`).
- Automated site-visit reminder engine processing scheduled bookings at **24 hours and 2 hours** prior to visit start time.
- Resilient background worker loop (`ReminderScheduler`) surviving application restarts and configured via environment settings.
- Robust database idempotency constraint (`uq_notifications_idempotency_key`) preventing duplicate notifications across rapid polling runs and restarts.
- Mandatory buyer consent validation (`lead.consent_to_contact: true`) ensuring opt-outs are strictly respected.
- User notification management endpoints: paginated listing (`GET /api/v1/notifications`), unread count (`GET /api/v1/notifications/unread-count`), single read (`PATCH /api/v1/notifications/{id}/read`), and bulk read (`POST /api/v1/notifications/mark-all-read`).
- Administrative reminder scan trigger endpoint (`POST /api/v1/notifications/reminders/trigger`) with strict role-based access control.

Module 9 adds:

- UUID-based `marketing_spends` table with an Alembic migration (`b1f2c3d4e5a6`).
- Role-scoped admin and sales-executive dashboards computed with SQL aggregation:
  - `GET /api/v1/dashboard/summary` for lead, booking, visit, conversion, handoff, first-response, and rate metrics.
  - `GET /api/v1/dashboard/trends` with `DAY`, `WEEK` (Monday start), and `MONTH` buckets.
  - `GET /api/v1/dashboard/sources` for admin source performance and cost per completed visit.
  - `GET /api/v1/dashboard/executives` for admin sales executive performance.
- Date-range (`date_from`, `date_to`) and `project_id` filters on every analytics endpoint.
- Admin-managed marketing spend CRUD at `/api/v1/dashboard/marketing-spend`, with optional project attribution and period-overlap matching.
- Database-side conditional counts, grouped aggregates, and an `OFFSET`/`LIMIT` median query that never loads the full message history.
- Explicit metric denominators and safe zero-denominator handling: rates return `0.0`; undefined response times and cost per visit return `null`.
- Sales executives see only currently assigned leads, their own bookings, and their own handoffs on active projects; other executives' lead data is never exposed.

External messaging (WhatsApp/SMS), calendar integrations (Google Calendar/Outlook), payment collection, and external notification services are not implemented yet.

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
│   │   │   ├── users/
│   │   │   │   ├── router.py
│   │   │   │   ├── service.py
│   │   │   │   ├── repository.py
│   │   │   │   ├── models.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── exceptions.py
│   │   │   └── projects/
│   │   │       ├── router.py
│   │   │       ├── service.py
│   │   │       ├── repository.py
│   │   │       ├── models.py
│   │   │       ├── schemas.py
│   │   │       └── exceptions.py
│   │   │   ├── leads/
│   │   │   │   ├── router.py
│   │   │   │   ├── service.py
│   │   │   │   ├── repository.py
│   │   │   │   ├── models.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── exceptions.py
│   │   │   ├── conversations/
│   │   │   │   ├── router.py
│   │   │   │   ├── service.py
│   │   │   │   ├── repository.py
│   │   │   │   ├── models.py
│   │   │   │   ├── schemas.py
│   │   │   │   └── exceptions.py
│   │   │   └── messages/
│   │   │       ├── router.py
│   │   │       ├── service.py
│   │   │       ├── repository.py
│   │   │       ├── models.py
│   │   │       ├── schemas.py
│   │   │       └── exceptions.py
│   │   │   └── ai_assistant/
│   │   │       ├── router.py
│   │   │       ├── service.py
│   │   │       ├── client.py
│   │   │       ├── prompts.py
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
Module 2 adds the second revision, which creates `projects`, `project_facts`,
and `fact_versions` with their indexes and constraints. When a later module adds
models:

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
| `POST` | `/api/v1/projects` | Admin | Create a project |
| `GET` | `/api/v1/projects` | Authenticated | Paginated projects; non-admins see active projects only |
| `GET` | `/api/v1/projects/{project_id}` | Authenticated | Project detail; non-admins see active projects only |
| `PATCH` | `/api/v1/projects/{project_id}` | Admin | Update project details or lifecycle status |
| `POST` | `/api/v1/projects/{project_id}/facts` | Admin | Create a draft fact |
| `GET` | `/api/v1/projects/{project_id}/facts` | Authenticated | Paginated facts; non-admins see approved facts only |
| `GET` | `/api/v1/facts/{fact_id}` | Authenticated | Fact detail; non-admins see approved facts only |
| `PATCH` | `/api/v1/facts/{fact_id}` | Admin | Edit a draft or stage an approved-fact edit |
| `POST` | `/api/v1/facts/{fact_id}/approve` | Admin | Approve a draft or publish a staged edit |
| `POST` | `/api/v1/facts/{fact_id}/reject` | Admin | Discard a staged edit or unpublish a fact |
| `GET` | `/api/v1/facts/{fact_id}/versions` | Admin | Paginated answer version history |
| `POST` | `/api/v1/leads` | Public | Create a lead enquiry |
| `GET` | `/api/v1/leads/duplicates/check` | Admin | Check duplicates by normalized email/phone |
| `GET` | `/api/v1/leads` | Admin / Sales Exec | Paginated lead listing, search, and filters |
| `GET` | `/api/v1/leads/{lead_id}` | Admin or assigned Sales Exec | Lead detail |
| `PATCH` | `/api/v1/leads/{lead_id}` | Admin or assigned Sales Exec | Update lead contact/budget fields |
| `PATCH` | `/api/v1/leads/{lead_id}/status` | Admin or assigned Sales Exec | Lifecycle status transition |
| `POST` | `/api/v1/leads/{lead_id}/assign` | Admin | Assign or reassign to an active sales executive |
| `GET` | `/api/v1/leads/{lead_id}/assignments` | Admin or assigned Sales Exec | Paginated assignment history |
| `POST` | `/api/v1/conversations` | Authenticated | Create a conversation (with optional initial message) |
| `GET` | `/api/v1/conversations` | Authenticated | Paginated conversations listing with project, lead, and status filters |
| `GET` | `/api/v1/conversations/{conversation_id}` | Authenticated | Conversation detail (role-isolated) |
| `PATCH` | `/api/v1/conversations/{conversation_id}/status` | Authenticated | Update conversation status (Admin required for ARCHIVED) |
| `POST` | `/api/v1/conversations/{conversation_id}/messages` | Authenticated | Send a message to an active conversation |
| `GET` | `/api/v1/conversations/{conversation_id}/messages` | Authenticated | Paginated message history (asc/desc order) |
| `GET` | `/api/v1/messages/{message_id}` | Authenticated | Retrieve an individual message (role-isolated) |
| `POST` | `/api/v1/conversations/{conversation_id}/chat` | Authenticated | Chat with the AI assistant in an active conversation |
| `POST` | `/api/v1/assistant/chat` | Authenticated | Chat with the AI assistant specifying conversation_id in body |
| `GET` | `/api/v1/dashboard/summary` | Admin / Sales Exec | Role-scoped operational summary |
| `GET` | `/api/v1/dashboard/trends` | Admin / Sales Exec | Role-scoped trend series (`DAY`, `WEEK`, `MONTH`) |
| `GET` | `/api/v1/dashboard/sources` | Admin | Source performance and cost per completed visit |
| `GET` | `/api/v1/dashboard/executives` | Admin | Sales executive performance table |
| `POST` | `/api/v1/dashboard/marketing-spend` | Admin | Record marketing spend |
| `GET` | `/api/v1/dashboard/marketing-spend` | Admin | Paginated marketing spend listing |
| `GET` | `/api/v1/dashboard/marketing-spend/{spend_id}` | Admin | Marketing spend detail |
| `PATCH` | `/api/v1/dashboard/marketing-spend/{spend_id}` | Admin | Update marketing spend |
| `DELETE` | `/api/v1/dashboard/marketing-spend/{spend_id}` | Admin | Delete marketing spend |
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

## Projects and fact sheets

A **project** is a developer offering with a name, unique slug, location,
description, optional RERA number, lifecycle status, and creator. A **fact** is
one independently editable question-and-answer record belonging to a project.
Facts are the approved source material that future AI answers must use.

### Project lifecycle

| Status | Meaning |
| --- | --- |
| `DRAFT` | Admin-only preparation state; hidden from buyers and sales executives |
| `ACTIVE` | Published project; readable by authenticated buyers and sales executives |
| `INACTIVE` | Temporarily unpublished; hidden from buyers and sales executives |

Admins may create a project in any valid initial state; the default is `DRAFT`.
Allowed updates are `DRAFT → ACTIVE`, `DRAFT → INACTIVE`, `ACTIVE → INACTIVE`,
and `INACTIVE → ACTIVE`. Once a project has left `DRAFT`, it cannot be moved
back to `DRAFT`, so published projects retain an explicit activation history.

Slugs are lowercase kebab-case and unique. If `slug` is omitted, it is generated
from the name; a generated collision receives a numeric suffix. Supplying a
duplicate slug returns `409`. Supplying an invalid slug returns `422`.

### Fact approval workflow

New facts always start as `DRAFT`. Draft facts are never returned to buyers or
sales executives and are never eligible for AI retrieval.

1. An admin creates or edits a draft fact. Draft edits are applied directly.
2. An admin approves the draft with `POST /api/v1/facts/{fact_id}/approve`.
3. Once approved, the fact becomes buyer-visible whenever its project is
   `ACTIVE`.
4. Editing an approved fact does **not** overwrite buyer-visible content.
   Instead, the proposed category, question, and answer are stored in
   `pending_*` fields and returned to admins as `pending_changes`.
5. The approved content remains visible until an admin approves the staged
   change. Approval publishes it atomically and clears `pending_changes`.
6. Rejecting a staged edit discards it and keeps the previous approved content.
   Rejecting an approved fact that has no staged edit returns it to `DRAFT`,
   removing it from buyer-visible reads.

Only administrators can create, edit, approve, reject, or inspect fact history.
Buyers and sales executives can read only approved facts belonging to active
projects; hidden records return `404` rather than revealing their existence.

### Version history

`FactVersion` is append-only. The initial fact answer is recorded as version 1
with `previous_answer = null`. Each later canonical answer change appends the
next sequential version in the same transaction as the fact update. Version
numbers are unique per fact through a database constraint, and fact rows are
locked on PostgreSQL while updates are applied.

If an edit changes only the category or question and leaves the answer
unchanged, no new version row is created. This avoids duplicate history entries
for unchanged answer content. `changed_by` records the admin who proposed the
published answer; for staged edits, that is the editor, not necessarily the
approver. History is available only to admins through the paginated endpoint.

### AI retrieval boundary

Future AI code must not query project tables directly. It should call:

```python
from app.modules.projects.service import get_approved_facts

facts = get_approved_facts(session, project_id, category="LOCATION")
```

The service returns plain `ApprovedFactContent` DTOs (`fact_id`, `category`,
`question`, `answer`) and returns an empty list when the project is missing or
not `ACTIVE`. It never returns draft facts or staged pending content. The
`category` filter is normalized to uppercase; passing `None` returns all
approved categories.

### Example project and fact workflow

```powershell
$headers = @{ Authorization = "Bearer $($tokenResponse.access_token)" }

$projectBody = @{
  name = "Skyline Residences"
  location = "Pune, Maharashtra"
  description = "Residential project"
  rera_number = "P52100012345"
} | ConvertTo-Json

$project = Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/api/v1/projects `
  -Headers $headers `
  -ContentType application/json `
  -Body $projectBody

$factBody = @{
  category = "LOCATION"
  question = "Where is the project located?"
  answer = "The project is in Pune."
} | ConvertTo-Json

$fact = Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/projects/$($project.id)/facts" `
  -Headers $headers `
  -ContentType application/json `
  -Body $factBody

Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/facts/$($fact.id)/approve" `
  -Headers $headers
```

To propose a change to that approved fact, call `PATCH /api/v1/facts/{fact_id}`
with the new fields. The response keeps the old `answer` and adds
`pending_changes`. Call `POST /api/v1/facts/{fact_id}/approve` to publish it or
`POST /api/v1/facts/{fact_id}/reject` to discard it.

Listing endpoints use `page`, `page_size`, and return `items`, `total`, `page`,
`page_size`, and `pages`. Admins may filter projects by `status` and facts by
`status` or `category`; non-admin status filters are clamped to `ACTIVE` and
`APPROVED` respectively.


## Lead management

Module 3 implements lead intake, source attribution, duplicate handling,
lifecycle status progression, and sales executive assignment history.

### Lead lifecycle

```text
       +-------------------------------------------------------+
       |                                                       |
       v                                                       |
     [NEW]                                                     |
       |                                                       |
       +------------+------------+                             |
       |            |            |                             |
       v            v            |                             |
  [CONTACTED] -> [QUALIFIED]     |                             |
       |            |            |                             |
       +------------+            |                             |
       |                         |                             |
       v                         v                             |
  [VISIT_BOOKED] --------> [VISIT_CANCELLED]                   |
       |                                                       |
       v                                                       |
   [VISITED]                                                   |
       |                                                       |
       v                                                       |
  [CONVERTED] (terminal)                                       |
                                                               |
  [NOT_INTERESTED] (terminal) <--------------------------------+
  [LOST]           (terminal) <--------------------------------+
```

Allowed transitions:
- `NEW` -> `CONTACTED`, `QUALIFIED`, `NOT_INTERESTED`, `LOST`
- `CONTACTED` -> `QUALIFIED`, `NOT_INTERESTED`, `VISIT_BOOKED`, `LOST`
- `QUALIFIED` -> `VISIT_BOOKED`, `NOT_INTERESTED`, `LOST`
- `VISIT_BOOKED` -> `VISITED`, `VISIT_CANCELLED`, `NOT_INTERESTED`, `LOST`
- `VISIT_CANCELLED` -> `VISIT_BOOKED`, `NOT_INTERESTED`, `LOST`
- `VISITED` -> `CONVERTED`, `NOT_INTERESTED`, `LOST`
- `CONVERTED`, `NOT_INTERESTED`, `LOST` are terminal states.

Transitions that violate the lifecycle return HTTP `400 BAD_REQUEST`.

### Consent enforcement

- Moving to contact-requiring states (`CONTACTED`, `QUALIFIED`, `VISIT_BOOKED`, `VISITED`, `CONVERTED`) requires `consent_to_contact: true`.
- Assigning an executive to a lead requires `consent_to_contact: true`.
- Moving to `NOT_INTERESTED` or `LOST` is always permitted without consent so buyer opt-outs can be recorded.

### Sources

Initial lead acquisition channels:
- `WEBSITE`
- `PROPERTY_PORTAL`
- `SOCIAL_MEDIA`
- `HOARDING`
- `REFERRAL`
- `OTHER`

### Duplicate detection rules

- Phone numbers are normalized by stripping whitespace and punctuation, converting leading `00` to `+`, and validating 7-15 digits.
- Email addresses are normalized by stripping whitespace, converting to lowercase, and treating empty strings as null.
- Enquiries matching an existing lead by phone or email return HTTP `409 CONFLICT` with `matching_lead_ids` and matched field names.
- Concurrency protection: In PostgreSQL, transactional advisory locks (`pg_advisory_xact_lock`) on hashed contact keys prevent duplicate creation race conditions.
- Administrators can proactively verify duplicates via `GET /api/v1/leads/duplicates/check?phone=...&email=...`.

### Assignment rules

- Only users with role `ADMIN` may assign or reassign leads.
- The target executive must be an active user with role `SALES_EXECUTIVE`.
- Reassignments preserve history by setting `unassigned_at` on the previous active assignment and creating a new assignment row.
- The partial unique index `uq_lead_assignments_active_lead` (`WHERE unassigned_at IS NULL`) guarantees that a lead has at most one active assignment at any time.

### Role permissions

- **ADMIN**: Access all leads, filter by any executive, update administrative fields (`project_id`, `source`), assign executives, and check duplicates.
- **SALES_EXECUTIVE**: Access only leads actively assigned to them on active projects. Attempts to query unassigned leads or leads on inactive projects return HTTP `404` to prevent leaking lead existence. Changing `project_id` or `source` returns HTTP `403`.
- **BUYER**: Forbidden from accessing internal lead endpoints (HTTP `403`).
- **PUBLIC**: Unauthenticated lead intake at `POST /api/v1/leads`. Schema rejects privileged fields (`status`, `assigned_executive_id`).

### Example lead enquiry intake (Public)

```powershell
$body = @{
  full_name = "Rajesh Sharma"
  phone = "+91 98200 12345"
  email = "rajesh.sharma@example.com"
  project_id = "$($project.id)"
  source = "WEBSITE"
  budget_min = 7500000
  budget_max = 12000000
  preferred_configuration = "3 BHK"
  consent_to_contact = $true
} | ConvertTo-Json

$lead = Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/api/v1/leads `
  -ContentType application/json `
  -Body $body
```

### Example duplicate conflict response (HTTP 409)

```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Conflict",
    "details": [
      {
        "duplicate": true,
        "matching_lead_ids": [
          "74d630d2-5967-4b61-9b38-8cf5ccecf7d4"
        ],
        "matching_fields": [
          "phone"
        ],
        "summary": "An existing lead matches the supplied phone. Review the existing record instead of creating a duplicate."
      }
    ]
  }
}
```

### Example executive assignment (Admin)

```powershell
Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/leads/$($lead.id)/assign" `
  -Headers $adminHeaders `
  -ContentType application/json `
  -Body (@{ executive_id = "$($executive.id)" } | ConvertTo-Json)
```

## Conversations and messages

Module 4 implements interactive conversation threads and message exchange
between buyers, sales executives, and future AI assistants.

### Conversation lifecycle

- `ACTIVE`: The conversation is ongoing; authorized participants can post messages.
- `CLOSED`: The conversation is completed; posting is blocked. Participants can close active threads.
- `ARCHIVED`: Retained thread; only administrators can move a conversation to `ARCHIVED`.

### Message sender types

- `BUYER`: Messages sent by registered buyers.
- `ASSISTANT`: Reserved for future AI assistant responses.
- `SALES_EXECUTIVE`: Messages sent by assigned sales executives.
- `SYSTEM`: Administrative updates or platform notifications.

### Access control rules

- **BUYER**: Accesses only their own conversations and messages. Can only post messages with `BUYER` sender type. Attempting to start a thread for a lead registered under another email is forbidden (`403`).
- **SALES_EXECUTIVE**: Accesses conversations and messages only for leads currently assigned to them on active projects. Can only post as `SALES_EXECUTIVE`.
- **ADMIN**: Accesses all conversations and messages, can post as `SYSTEM` or `SALES_EXECUTIVE`, and archive conversations.
- **Privacy & Safety**: Requests for conversations or messages not accessible to the caller return `404 Not Found` rather than `403 Forbidden` to prevent revealing the existence of other users' conversations.
- **Validation**: Empty or whitespace-only messages are rejected (`422`). Posting to `CLOSED` or `ARCHIVED` threads is rejected (`400`).

### Example conversation and messaging flow

```powershell
$headers = @{ Authorization = "Bearer $($tokenResponse.access_token)" }

# 1. Start conversation for an existing lead
$convBody = @{
  lead_id = "$($lead.id)"
  project_id = "$($project.id)"
  initial_message = "Hi, does this project have a swimming pool and clubhouse?"
} | ConvertTo-Json

$conv = Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/api/v1/conversations `
  -Headers $headers `
  -ContentType application/json `
  -Body $convBody

# 2. Reply to the conversation
$replyBody = @{
  content = "Yes, both a heated pool and a clubhouse are included in the amenities."
} | ConvertTo-Json

$reply = Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/conversations/$($conv.id)/messages" `
  -Headers $headers `
  -ContentType application/json `
  -Body $replyBody

# 3. Retrieve conversation history
$messages = Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/v1/conversations/$($conv.id)/messages?order=asc&page=1&page_size=50" `
  -Headers $headers
```

## AI Assistant (Groq)

Module 5 integrates an AI Assistant powered by Groq (`openai/gpt-oss-120b`)
to provide fact-grounded, multilingual conversation assistance to buyers.

### Safety rules and boundaries

- **Grounded exclusively in approved facts**: Uses Module 2's `get_approved_facts()`
  boundary. Draft facts and staged pending edits are never included.
- **Zero invented data**: Never invents amenities, locations, configurations,
  prices, discounts, or legal details.
- **No pricing negotiation**: Does not negotiate or quote final prices.
  Indicative prices from approved facts are framed as estimates, with final
  quotes deferred to sales executives.
- **Transparent missing facts handling**: If a requested fact is missing, the
  assistant explicitly informs the buyer that the information is currently
  unavailable in the verified fact sheet and promises executive confirmation.
- **Human request support**: Buyers can request a human at any time; the
  assistant warmly acknowledges the request and confirms executive follow-up.
- **Multilingual capability**: Seamlessly supports English, Hindi, and Gujarati.
- **Zero-loss enquiry guarantee**: The buyer's message is persisted to the
  database before calling Groq. If Groq times out, errors, or if the API key is
  unconfigured, the buyer enquiry is preserved and a polite fallback reply is
  saved and returned.

### Example AI chat flow

```powershell
$headers = @{ Authorization = "Bearer $($tokenResponse.access_token)" }

$chatBody = @{
  message = "Where is Skyline Residences located and what amenities are available?"
} | ConvertTo-Json

$chat = Invoke-RestMethod -Method Post `
  -Uri "http://127.0.0.1:8000/api/v1/conversations/$($conv.id)/chat" `
  -Headers $headers `
  -ContentType application/json `
  -Body $chatBody

$chat.reply
```

## Dashboard and analytics

Module 9 exposes role-scoped operational analytics and an admin-managed
marketing spend ledger. Every metric is produced by database aggregation
queries; only aggregate rows leave the database (the median response query
loads at most two ordered values).

### Access and filters

| Endpoint | Access | Scope |
| --- | --- | --- |
| `GET /api/v1/dashboard/summary` | Admin / Sales Exec | Admin sees all data; an executive sees only leads actively assigned to them and their own bookings and handoffs on active projects |
| `GET /api/v1/dashboard/trends` | Admin / Sales Exec | Same role scope as summary |
| `GET /api/v1/dashboard/sources` | Admin | All sources, including spend-only sources |
| `GET /api/v1/dashboard/executives` | Admin | All active sales executives |
| `/api/v1/dashboard/marketing-spend` (CRUD) | Admin | Spend records |

All analytics endpoints accept:

- `date_from` and `date_to` — ISO-8601 timestamps, normalized to UTC. Omitting
  them means no lower or upper bound. `date_from` must not be after `date_to`.
- `project_id` — optional UUID project filter.
- `granularity` — trends only: `DAY` (default), `WEEK` (Monday start), or
  `MONTH`.

### Metric definitions and denominators

| Metric | Definition | Denominator |
| --- | --- | --- |
| `total_leads` | Leads whose `created_at` falls in the range | — |
| `new_leads` | Cohort leads currently `NEW` | — |
| `assigned_leads` | Cohort leads with an active (`unassigned_at IS NULL`) assignment | — |
| `bookings` | Bookings whose `created_at` falls in the range | — |
| `completed_visits` | Bookings with status `COMPLETED` whose visit slot `start_time` falls in the range | — |
| `no_show_visits` | Bookings with status `NO_SHOW` whose visit slot `start_time` falls in the range | — |
| `cancelled_bookings` | Bookings with status `CANCELLED` whose `cancelled_at` falls in the range | — |
| `conversions` | Cohort leads currently `CONVERTED` | — |
| `handoffs_total` / `handoffs_active` / `handoffs_resolved` | Handoffs created in the range by status | — |
| `lead_to_visit_conversion_rate` | Distinct cohort leads holding at least one booking | Cohort `total_leads` |
| `site_visit_show_up_rate` | `completed_visits` | `completed_visits + no_show_visits` |
| `lead_conversion_rate` | Cohort `conversions` | Cohort `total_leads` |
| `cost_per_visit` | Marketing spend for the source | Source `completed_visits` |
| `average_first_response_seconds` | Mean seconds from a lead's first `BUYER` message to the first subsequent `ASSISTANT` or `SALES_EXECUTIVE` message | Reported as `first_response_sample_size` |
| `median_first_response_seconds` | Median of the same response intervals | Same sample |

`SYSTEM` messages are never counted as first responses. When a denominator is
zero, rates return `0.0`; an undefined `cost_per_visit` or response-time value
returns `null`. Empty result sets return zero counts and empty source/trend
lists rather than errors.

For sales executives, `assigned_leads` is the executive's own cohort of
currently assigned leads. Their lead-to-visit and lead-conversion denominators
use that assigned-lead count. Their bookings are scoped by
`bookings.executive_id`, and handoffs by `handoffs.executive_id`.

### Source performance and marketing spend

`GET /api/v1/dashboard/sources` returns one row per source that has leads,
bookings, cancellations, visits, or spend in the selected period. Each row
includes lead, booking, visit, cancellation, conversion, marketing spend, cost
per visit, and the three rates defined above.

Marketing spend records have a `source`, inclusive `period_start` /
`period_end` dates, a non-negative `amount`, optional `notes`, and an optional
`project_id`. A record with a `project_id` applies only to that project. A
record without a `project_id` represents developer-wide spend and is included
only when the dashboard is not filtered to a project.

Spend is matched by **period overlap** with the dashboard date range and the
full recorded amount is included; it is not prorated. For example, a January
spend record is fully counted in a one-week January dashboard window. Listing
filters (`period_from`, `period_to`) use the same overlap rule. Create and
update requests reject an inverted period, a negative amount, or a nonexistent
project.

### Example dashboard request

```powershell
$headers = @{ Authorization = "Bearer $($token.access_token)" }

$summary = Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/v1/dashboard/summary?date_from=2026-01-01T00:00:00Z&date_to=2026-01-31T23:59:59Z&project_id=$($project.id)" `
  -Headers $headers

$trends = Invoke-RestMethod `
  -Uri "http://127.0.0.1:8000/api/v1/dashboard/trends?date_from=2026-01-01T00:00:00Z&date_to=2026-03-31T23:59:59Z&granularity=WEEK" `
  -Headers $headers
```

Example marketing spend record:

```powershell
$spendBody = @{
  source = "WEBSITE"
  project_id = "$($project.id)"
  period_start = "2026-01-01"
  period_end = "2026-01-31"
  amount = "150000.00"
  notes = "January website campaign"
} | ConvertTo-Json

Invoke-RestMethod -Method Post `
  -Uri http://127.0.0.1:8000/api/v1/dashboard/marketing-spend `
  -Headers $headers `
  -ContentType application/json `
  -Body $spendBody
```

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
pytest tests/integration/test_projects.py
pytest tests/integration/test_facts.py
pytest tests/integration/test_leads.py
pytest tests/integration/test_bookings.py
pytest tests/integration/test_handoffs.py
pytest tests/integration/test_notifications.py
pytest tests/integration/test_dashboard.py
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
  user listing, account status changes, project creation/updates, slug
  conflicts, lifecycle transitions, project and fact pagination, draft
  visibility, fact approval/rejection, staged approved-fact edits, sequential
  version history, unchanged-edit deduplication, role restrictions, and
  `get_approved_facts()` retrieval.

## Manual verification performed

Modules 0, 1, 2, and 3 were verified with:

```text
docker compose up -d db        -> PostgreSQL 16 healthy
alembic upgrade head           -> 692d4e5b740f, abb9e59a730a, 9daee97d8ebe applied
alembic downgrade -1           -> Module 3 tables removed
alembic upgrade head           -> Module 3 tables restored
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
POST /api/v1/projects          -> 201 draft project (admin)
GET /api/v1/projects           -> 403 for anonymous, active-only for buyer
POST /api/v1/projects/{id}/facts -> 201 draft fact (admin)
POST /api/v1/facts/{id}/approve  -> 200 approved fact
GET /api/v1/facts/{id}         -> 200 for buyer, 404 for draft fact
POST /api/v1/leads             -> 201 lead created (public intake)
GET /api/v1/leads/duplicates/check -> 200 duplicate check (admin)
POST /api/v1/leads/{id}/assign -> 200 assigned executive (admin)
GET /api/v1/leads/{id}/assignments -> 200 assignment history
PATCH /api/v1/leads/{id}/status -> 200 status transition
pytest                         -> 109 passed
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
- Project and fact deletion endpoints are not implemented. Facts are unpublished
  through rejection or an inactive project rather than deleted.
- Fact version history records answer changes only. Category and question
  changes are audited on the fact's `updated_by`/`updated_at` fields but do not
  create a separate version row.
- Fact categories are normalized uppercase free-form labels. No fixed category
  vocabulary is mandated by `PROJECT.md`; a future agreed allowlist can be
  enforced at the schema boundary without changing storage.
- Dashboard trends return only buckets that contain data; empty days, weeks, or
  months are not filled in. Marketing spend is matched by period overlap and is
  not prorated across the requested date range.
- First-response time is measured from the first `BUYER` message per lead to the
  first later `ASSISTANT` or `SALES_EXECUTIVE` message. Leads with no such
  response are excluded from the response sample, and the sample size is
  reported alongside the average and median.
- Tests use SQLite for isolation; the live manual check exercised PostgreSQL.
- Docker Compose starts PostgreSQL only. Containerising the API and frontend is
  outside the current module scope.
- Logging is JSON to stdout with no rotation, aggregation, or request-ID
  middleware yet.
- No metrics, tracing, rate limiting, or audit dashboard are included yet.
- Production secrets should be supplied by the deployment environment or a
  secrets manager, never committed.

---

## Technology Stack & Architecture

### Backend Architecture
- **Framework**: FastAPI (Python 3.13) with modular domain packages
- **Database & ORM**: PostgreSQL 16 (production/Docker) & SQLite (local/testing), SQLAlchemy 2.0 (mapped column models)
- **Migrations**: Alembic with 10 sequential migrations up to `d4e5f6a7b8c9`
- **Authentication & Security**: Argon2 password hashing (`argon2-cffi`), HMAC-SHA256 JWT access tokens (`PyJWT`), strict RBAC guards
- **AI Engine**: Groq Python SDK (`openai/gpt-oss-120b`) with fact sheet grounding, multilingual prompts (EN/HI/GU), and human escalation hooks
- **Validation**: Pydantic v2 schemas for all request/response boundaries

### Frontend Architecture
- **Framework**: React 19, TypeScript 5.8+, Vite 8
- **Styling**: Tailwind CSS v4, `@fontsource/dm-serif-display`, `@fontsource-variable/manrope`
- **State & Data Fetching**: TanStack Query v5 (`@tanstack/react-query`) with automatic background revalidation and optimistic updates
- **Routing**: React Router v7 with role-based auth guards (`AdminAuthGuard`, `SalesAuthGuard`, `BuyerAuthGuard`)
- **Animation & Visuals**: Framer Motion, Lucide icons, custom responsive SVG Bezier spline charts
- **Form Management**: React Hook Form with Zod schema resolvers

---

## Local Development Setup

### 1. Prerequisites
- **Python**: 3.11+ (Python 3.13 recommended)
- **Node.js**: v18+ (Node v20+ recommended)
- **Git**

### 2. Backend Setup
```bash
# Navigate to backend directory
cd backend

# Create and activate a virtual environment
python -m venv .venv

# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run database setup & seeding (creates tables, built-in roles, and sample data)
python scripts/setup_dev_database.py

# Start the FastAPI server (running on http://127.0.0.1:8000)
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server (running on http://127.0.0.1:5173)
npm run dev

# Or build and run production preview
npm run build
npm run preview
```

### 4. Default Seeded Credentials
| Role | Email | Password Environment Variable | Default Fallback |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin.demo@keylo.com` | `KEYLO_ADMIN_PASSWORD` | `KeyloAdmin!2026#` |
| **Sales Executive** | `sales.demo@keylo.com` | `KEYLO_SALES_PASSWORD` | `KeyloSales!2026#` |
| **Buyer** | `buyer.demo@keylo.com` | `KEYLO_BUYER_PASSWORD` | `KeyloBuyer!2026#` |

### 5. Realistic 1-Month Demo Environment (Ahmedabad 2/3 BHK, Oct 7 – Nov 7, 2026)
To seed or refresh a complete 1-month realistic demonstration environment covering 45 buyers, 3 Ahmedabad residential projects, 125 leads, visit slots, bookings, multilingual AI conversations (English, Hindi, Gujarati), sales follow-ups, human handoffs, and marketing spend analytics:

```bash
# Seed realistic demo data (idempotent, safe):
cd backend
python scripts/prepare_demo_environment.py

# To reset and purge only generated demo records:
python scripts/prepare_demo_environment.py --reset

# Run automated browser verification suite across all 3 portals:
node frontend/scripts/verify-demo-environment.mjs
```

#### Demo Login Credentials:
| Portal | Role | Email | Default Password | Primary Dashboard |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Console** | `ADMIN` | `admin.demo@keylo.com` | `KeyloAdmin!2026#` | `http://127.0.0.1:5173/admin` |
| **Sales Workspace** | `SALES_EXECUTIVE` | `sales.demo@keylo.com` | `KeyloSales!2026#` | `http://127.0.0.1:5173/sales` |
| **Buyer Portal** | `BUYER` | `buyer.demo@keylo.com` | `KeyloBuyer!2026#` | `http://127.0.0.1:5173/buyer` |

---

## Database Migrations

Keylo uses Alembic for declarative database versioning.

```bash
# Check current migration revision
cd backend
alembic heads

# Apply all pending migrations to head
alembic upgrade head

# Rollback one migration
alembic downgrade -1
```

### Migration History:
1. `692d4e5b740f`: Roles and Users
2. `abb9e59a730a`: Projects and Project Fact Sheets
3. `9daee97d8ebe`: Leads and Lead Assignments
4. `aabcedc42aef`: Conversations and Messages
5. `62cc99aeab0b`: Visit Slots and Bookings
6. `77a9d0f475be`: Human Handoffs
7. `3df128151593`: Notifications and In-App Alerts
8. `b1f2c3d4e5a6`: Marketing Spends & ROI Tracking
9. `c3d4e5f6a7b8`: Sales Executive Follow-ups
10. `d4e5f6a7b8c9`: System Settings, Notification Templates, and Audit Logs

---

## API Endpoints Reference Catalog

### Authentication (`/api/v1/auth`)
- `POST /api/v1/auth/register` — Public buyer registration with Argon2
- `POST /api/v1/auth/login` — Authenticate and receive JWT access token
- `GET /api/v1/auth/me` — Read current authenticated user profile
- `PATCH /api/v1/auth/me` — Update self profile details

### User Management (`/api/v1/users`)
- `GET /api/v1/users` — Paginated user listing with search and role filters (Admin)
- `POST /api/v1/users` — Create user with assigned role (Admin)
- `GET /api/v1/users/metrics` — Aggregate metrics for user distributions (Admin)
- `GET /api/v1/users/{id}` — Retrieve user profile by ID (Admin)
- `PATCH /api/v1/users/{id}` — Update user role or profile (Admin)
- `POST /api/v1/users/{id}/deactivate` — Deactivate user account (Admin)
- `POST /api/v1/users/{id}/reactivate` — Reactivate user account (Admin)

### Projects & Fact Sheets (`/api/v1/projects`)
- `GET /api/v1/projects` — List projects (active catalog for Buyers, all for Admin)
- `POST /api/v1/projects` — Create new development project (Admin)
- `GET /api/v1/projects/{id}` — Project details and summary
- `PATCH /api/v1/projects/{id}` — Update project metadata and status (Admin)
- `GET /api/v1/projects/{id}/facts` — Project fact sheet listing
- `POST /api/v1/projects/{id}/facts` — Add fact sheet entry (Admin)
- `PATCH /api/v1/facts/{id}` — Update fact or stage pending edits (Admin)
- `POST /api/v1/facts/{id}/approve` — Approve pending fact sheet changes (Sales Head / Admin)
- `POST /api/v1/facts/{id}/publish` — Publish approved fact sheet entry (Admin)

### Leads & Sales Assignments (`/api/v1/leads`)
- `POST /api/v1/leads` — Public lead enquiry intake
- `GET /api/v1/leads` — Paginated lead queue with source/status filters
- `GET /api/v1/leads/duplicates/check` — Proactive duplicate checking (Admin)
- `GET /api/v1/leads/{id}` — Lead details and activity timeline
- `PATCH /api/v1/leads/{id}/status` — Transition lead lifecycle state
- `POST /api/v1/leads/{id}/assign` — Assign or reassign lead to sales executive (Admin)
- `GET /api/v1/leads/{id}/assignments` — Historical assignment audit trail

### AI Assistant & Conversations (`/api/v1/conversations`, `/api/v1/assistant`)
- `POST /api/v1/conversations` — Start new buyer enquiry conversation
- `GET /api/v1/conversations` — List conversations with role-based isolation
- `GET /api/v1/conversations/{id}/messages` — Paginated conversation dialogue
- `POST /api/v1/conversations/{id}/messages` — Post buyer/sales message
- `POST /api/v1/conversations/{id}/chat` — AI Assistant chat response grounded in approved facts
- `POST /api/v1/assistant/chat` — Direct fact-grounded assistant completion endpoint
- `PATCH /api/v1/conversations/{id}/status` — Update thread lifecycle (`ACTIVE`, `CLOSED`, `ARCHIVED`)

### Site Visits & Slots (`/api/v1/slots`, `/api/v1/bookings`)
- `GET /api/v1/slots/available` — Real-time available slot capacity for buyers
- `POST /api/v1/slots` — Create visit slot with capacity (Admin)
- `PATCH /api/v1/slots/{id}` — Update slot capacity and notes (Admin)
- `PATCH /api/v1/slots/{id}/block` — Block slot from buyer booking (Admin)
- `GET /api/v1/bookings` — Role-isolated booking list
- `POST /api/v1/bookings` — Book site visit with concurrency locks
- `POST /api/v1/bookings/{id}/cancel` — Cancel booking and restore slot capacity
- `POST /api/v1/bookings/{id}/reschedule` — Reschedule visit booking to new slot
- `PATCH /api/v1/bookings/{id}/status` — Update visit outcome (`COMPLETED`, `NO_SHOW`)

### Human Handoffs & Follow-ups (`/api/v1/handoffs`, `/api/v1/follow-ups`)
- `POST /api/v1/handoffs` — Request human sales executive escalation
- `GET /api/v1/handoffs` — List pending/active handoffs for sales executive
- `PATCH /api/v1/handoffs/{id}` — Resolve handoff with outcome notes
- `GET /api/v1/follow-ups` — List sales executive scheduled follow-up tasks
- `POST /api/v1/follow-ups` — Schedule prospective buyer follow-up
- `PATCH /api/v1/follow-ups/{id}/complete` — Mark follow-up as complete

### Notifications & System Settings (`/api/v1/notifications`, `/api/v1/settings`)
- `GET /api/v1/notifications` — List authenticated user in-app notifications
- `PATCH /api/v1/notifications/{id}/read` — Mark notification as read
- `POST /api/v1/notifications/mark-all-read` — Mark all notifications as read
- `GET /api/v1/settings` — Read system configuration (reminders, AI, languages, routing) (Admin)
- `PATCH /api/v1/settings/reminders` — Update 24h & 2h reminder configuration (Admin)
- `POST /api/v1/settings/reminders/scan` — Trigger immediate reminder dispatch scan (Admin)
- `PATCH /api/v1/settings/ai-assistant` — Update AI temperature, grounding, fallback reply (Admin)
- `PATCH /api/v1/settings/languages` — Configure supported platform languages (Admin)
- `PATCH /api/v1/settings/lead-assignment` — Update routing strategy (Round-robin, Load-balanced) (Admin)
- `POST /api/v1/settings/broadcast` — Broadcast announcement to platform users (Admin)
- `GET /api/v1/templates` — List notification message templates (Admin)
- `PATCH /api/v1/templates/{id}` — Customize notification title & body template (Admin)
- `GET /api/v1/audit-logs` — Immutable administrative activity audit trail (Admin)

### Analytics & Reports (`/api/v1/analytics`)
- `GET /api/v1/analytics/dashboard` — Executive KPI summary (leads, visits, conversions, response time)
- `GET /api/v1/analytics/trends` — Multi-interval acquisition and conversion trajectory
- `GET /api/v1/analytics/sources` — Channel attribution, spend, and cost-per-visit ROI
- `GET /api/v1/analytics/executives` — Sales executive conversion & performance table
- `POST /api/v1/analytics/marketing-spends` — Record marketing channel expenditure (Admin)

---

## Testing & Quality Assurance

### 1. Backend Automated Test Suite
Keylo includes 224 unit and integration tests covering security, role isolation, AI grounding, concurrency locks, and lifecycle workflows:

```bash
# Run complete backend test suite
backend/.venv/Scripts/python.exe -m pytest backend/tests -v
```
**Results**: `224 passed in 63.55s` (100% pass rate).

### 2. Frontend Typecheck and Build
```bash
npm --prefix frontend run build
```
**Results**: Clean TypeScript compilation (`tsc --noEmit`) and Vite bundling (0 errors, 2,753 modules).

### 3. Comprehensive Browser E2E Test Suite
Puppeteer E2E tests verify all real-world flows across public homepage, buyer portal, multilingual chat, sales workspace, and the complete admin console:

```bash
# Run master end-to-end QA suite
node frontend/scripts/verify-full-e2e-suite.mjs
```
**Results**: All buyer, sales, and admin workflows verified cleanly with zero console errors.

