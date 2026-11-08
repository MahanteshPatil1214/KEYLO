# Keylo — Deployment Guide

## Running Locally

### Prerequisites

| Tool | Version |
|------|---------|
| Python | 3.12 or 3.13 |
| Node.js | 18+ |
| pnpm or npm | latest |
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
python -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Copy the example env file and fill in your values
copy .env.example .env       # Windows
# cp .env.example .env       # macOS / Linux
```

Edit `.env` and set at minimum:

```
DATABASE_URL=sqlite:///./keylo_dev.db
JWT_SECRET_KEY=<generate a secure random string>
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
pytest --tb=short -q
```

**Frontend (build check):**

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

## Deployment Architecture

Keylo is not currently deployed to a live environment. The recommended production topology is:

```
GitHub (main branch)
    │
    ▼  CI/CD (GitHub Actions — planned)
    │
    ├── Backend ──► Railway / Render / VPS
    │               Docker container
    │               Gunicorn + Uvicorn workers
    │               PostgreSQL (managed)
    │
    └── Frontend ──► Vercel / Netlify / CDN
                     Static build (npm run build)
```

For a self-hosted VPS, a `docker-compose.yml` can orchestrate:
- `api` service (FastAPI + Uvicorn)
- `db` service (PostgreSQL)
- `frontend` service (Nginx serving the Vite static build)

---

## Environment Variables

> ⚠️ Never commit actual values. Store secrets in your hosting provider's secret manager or a `.env` file excluded from version control.

### Backend (`.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | SQLAlchemy connection string (SQLite for dev, PostgreSQL for prod) |
| `JWT_SECRET_KEY` | Secret used to sign JWT tokens — must be a long random string |
| `JWT_ALGORITHM` | Signing algorithm (default: `HS256`) |
| `JWT_ISSUER` | Issuer claim in the JWT |
| `JWT_AUDIENCE` | Audience claim in the JWT |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token lifetime in minutes |
| `GROQ_API_KEY` | API key from [console.groq.com](https://console.groq.com) |
| `GROQ_MODEL` | Model name, e.g. `openai/gpt-oss-120b` |
| `CORS_ALLOWED_ORIGINS` | Comma-separated list of allowed frontend origins |
| `KEYLO_ADMIN_PASSWORD` | Password set for the demo admin account during seeding |
| `KEYLO_SALES_PASSWORD` | Password set for the demo sales account during seeding |
| `KEYLO_BUYER_PASSWORD` | Password set for the demo buyer account during seeding |
| `KEYLO_DEV_PASSWORD` | Generic dev account password |
| `ENVIRONMENT` | `development` or `production` |
| `DEBUG` | `true` / `false` |
| `LOG_LEVEL` | `DEBUG`, `INFO`, `WARNING`, `ERROR` |

### Frontend (`.env.local`)

| Variable | Description |
|----------|-------------|
| `VITE_API_BASE_URL` | Base URL for the backend API, e.g. `http://localhost:8000` |

---

## Demo Login Credentials

> These are **local demo credentials only**. They are created by the seed script and are not production accounts.

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin.demo@keylo.com` | set via `KEYLO_ADMIN_PASSWORD` |
| Sales Executive | `sales.demo@keylo.com` | set via `KEYLO_SALES_PASSWORD` |
| Buyer | `buyer.demo@keylo.com` | set via `KEYLO_BUYER_PASSWORD` |

Change these by setting the corresponding environment variables before running the seed script:

```bash
set KEYLO_ADMIN_PASSWORD=YourStrongPasswordHere
python scripts/prepare_demo_environment.py
```

---

## Common Issues

| Problem | Fix |
|---------|-----|
| `table roles already exists` on `alembic upgrade head` | Run `alembic stamp head` to sync Alembic's version tracking with an existing database |
| `ModuleNotFoundError` on backend start | Ensure the virtual environment is activated and `pip install -r requirements.txt` has been run |
| Frontend API calls fail (CORS) | Confirm `VITE_API_BASE_URL` matches the backend address and `CORS_ALLOWED_ORIGINS` includes the frontend origin |
| Groq API errors | Check `GROQ_API_KEY` is set and the model name is correct in `.env` |
| Puppeteer E2E fails | Ensure both backend (`port 8000`) and frontend (`port 5173`) are running before executing the script |
