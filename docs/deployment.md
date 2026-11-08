# Keylo — Deployment Guide

## Running Locally

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.12 or 3.13 |
| Node.js | 20.x or higher |
| npm | latest |
| Git | any recent |

---

### 1. Clone the Repository

```bash
git clone https://github.com/MahanteshPatil1214/KEYLO.git
cd KEYLO
```

---

### 2. Backend Setup

```bash
cd backend

# Create and activate virtual environment
# Windows:
python -m venv .venv
.venv\Scripts\activate

# macOS / Linux:
# python3 -m venv .venv
# source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Copy the example env file and fill in your values
copy .env.example .env       # Windows
# cp .env.example .env       # macOS / Linux
```

Edit `.env` and set at minimum:

```
DATABASE_URL=sqlite:///./keylo_dev.db
JWT_SECRET_KEY=<generate a secure random string of 32+ characters>
GROQ_API_KEY=<your Groq API key>
```

```bash
# Apply database migrations
alembic upgrade head

# Seed initial roles and admin account
python scripts/setup_dev_database.py

# (Optional) Load one month of realistic demo data
python scripts/prepare_demo_environment.py

# Start the API server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

---

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

The UI will be available at `http://localhost:5173`.

---

### 4. Run Tests

**Backend (Python / Pytest):**

```bash
cd backend
.venv\Scripts\activate      # Windows
# source .venv/bin/activate # macOS / Linux
pytest --tb=short -q
```

**Frontend (TypeScript typecheck + production build):**

```bash
cd frontend
npm run build
```

**Frontend E2E (Puppeteer) — requires both servers running:**

```bash
cd frontend
node scripts/verify-demo-environment.mjs
```

---

### 5. Resetting the Demo Environment

```bash
cd backend
# Reset only demo data, never touches real accounts
python scripts/prepare_demo_environment.py --reset
python scripts/prepare_demo_environment.py
```

---

## Docker Compose (Full Stack)

Spin up the entire stack — PostgreSQL, FastAPI backend, and Vite frontend — with a single command:

```bash
# From the repository root
docker compose up --build

# Backend API:  http://localhost:8000
# Frontend:     http://localhost:5173
# API docs:     http://localhost:8000/docs
# Database:     localhost:5432
```

Create a `.env` file at the repository root (or export variables) to override defaults:

| Variable | Default | Description |
|----------|---------|-------------|
| `POSTGRES_DB` | `keylo_db` | Database name |
| `POSTGRES_USER` | `keylo` | Database user |
| `POSTGRES_PASSWORD` | `change-me-local-dev` | Database password |
| `POSTGRES_PORT` | `5432` | Host port for PostgreSQL |
| `JWT_SECRET_KEY` | `change-me-...` | JWT signing secret (change in production) |
| `GROQ_API_KEY` | *(empty)* | Groq LLM API key for AI assistant |

Seed demo data:

```bash
docker compose --profile seed up seed
```

Stop and clean up:

```bash
docker compose down          # Stop and remove containers
docker compose down -v       # Also remove database volume (destroys all data)
```

---

## Deployment Architecture

Keylo is not currently deployed to a live environment. It runs locally via Docker Compose or directly on `localhost`.

The recommended production topology is:

```
GitHub (main branch)
    │
    ▼  CI/CD (GitHub Actions — see .github/workflows/ci.yml)
    │
    ├── Backend ──► Railway / Render / VPS / Cloud Run
    │               Docker container
    │               Uvicorn workers
    │               PostgreSQL (managed)
    │
    └── Frontend ──► Vercel / Netlify / CDN / S3 + CloudFront
                     Static build (npm run build)
```

For a self-hosted VPS, `docker-compose.yml` orchestrates:
- `db` service (PostgreSQL 16)
- `backend` service (FastAPI + Uvicorn)
- `frontend` service (Vite dev server / static build)
- `seed` service (one-off demo data, opt-in via `--profile seed`)

---

## Environment Variables

> ⚠️ Never commit actual values. Store secrets in your hosting provider's secret manager or a `.env` file excluded from version control.

### Backend (`.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLAlchemy connection string (SQLite for dev, PostgreSQL for prod) |
| `JWT_SECRET_KEY` | Secret used to sign JWT tokens — must be a long random string (32+ chars) |
| `JWT_ALGORITHM` | Signing algorithm (default: `HS256`) |
| `JWT_ISSUER` | Issuer claim in the JWT |
| `JWT_AUDIENCE` | Audience claim in the JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime in minutes |
| `GROQ_API_KEY` | API key from [console.groq.com](https://console.groq.com) |
| `GROQ_MODEL` | Model name, e.g. `openai/gpt-oss-120b` |
| `CORS_ALLOWED_ORIGINS` | JSON list or comma-separated list of allowed frontend origins |
| `ENVIRONMENT` | `development`, `testing`, or `production` |
| `DEBUG` | `true` / `false` |
| `LOG_LEVEL` | `DEBUG`, `INFO`, `WARNING`, `ERROR` |
| `LEAD_CREATE_RATE_LIMIT_PER_MINUTE` | Public lead intake rate limit |
| `GROQ_TIMEOUT_SECONDS` | Timeout for Groq API calls |
| `GROQ_MAX_RETRIES` | Maximum retry attempts for Groq API calls |
| `ASSISTANT_MAX_HISTORY_MESSAGES` | Max history messages in assistant context |
| `ASSISTANT_TEMPERATURE` | Sampling temperature for assistant |
| `REMINDER_SCHEDULER_ENABLED` | Whether background reminder scheduler runs |
| `REMINDER_POLL_INTERVAL_SECONDS` | Interval between reminder scheduler checks |

### Frontend (`.env.local` or Vite env)

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Base URL for the backend API, e.g. `http://localhost:8000` |

---

## Demo Login Credentials

> These are **local demo credentials only**. They are created by the seed script and are not production accounts. Do not use real personal data.

| Role | Email | Password | Portal URL |
|------|-------|----------|------------|
| Admin | `admin.demo@keylo.com` | `Admin@123456` | http://localhost:5173/admin |
| Sales Executive | `sales.demo@keylo.com` | `Sales@123456` | http://localhost:5173/sales |
| Buyer | `buyer.demo@keylo.com` | `Buyer@123456` | http://localhost:5173/buyer |

These accounts are seeded by `python scripts/prepare_demo_environment.py`.

Change passwords by setting the corresponding environment variables before running the seed script:

```bash
# Windows PowerShell
$env:KEYLO_ADMIN_PASSWORD="YourStrongPasswordHere"
python scripts/prepare_demo_environment.py

# macOS / Linux
KEYLO_ADMIN_PASSWORD="YourStrongPasswordHere" python scripts/prepare_demo_environment.py
```

**[ASSUMPTION]** The seed script reads demo account passwords from `KEYLO_ADMIN_PASSWORD`, `KEYLO_SALES_PASSWORD`, and `KEYLO_BUYER_PASSWORD` environment variables, falling back to the defaults shown above if not set.

---

## Common Issues

| Problem | Fix |
|---------|-----|
| `table roles already exists` on `alembic upgrade head` | Run `alembic stamp head` to sync Alembic's version tracking with an existing database |
| `ModuleNotFoundError` on backend start | Ensure the virtual environment is activated and `pip install -r requirements.txt` has been run |
| Frontend API calls fail (CORS) | Confirm `VITE_API_BASE_URL` matches the backend address and `CORS_ALLOWED_ORIGINS` includes the frontend origin |
| Groq API errors | Check `GROQ_API_KEY` is set and the model name is correct in `.env` |
| Puppeteer E2E fails | Ensure both backend (`port 8000`) and frontend (`port 5173`) are running before executing the script |
| SQLite database locked | Ensure only one backend process is running against `keylo_dev.db` |
