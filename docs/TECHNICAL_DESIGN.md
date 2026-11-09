# Keylo — Technical Design Document

**GitHub Repository:** https://github.com/MahanteshPatil1214/KEYLO  
**Live Deployment:** Not currently deployed (local development only)

---

## 1. Architecture

### Overview

Keylo is a **modular monolith** — a single deployable application whose internals are separated into well-defined, independently testable modules. This was chosen over microservices because:

- The team is small and velocity matters more than independent scaling.
- All domains (leads, conversations, bookings) share the same database, so distributed transactions are unnecessary overhead.
- A monolith is simpler to run locally, test end-to-end, and migrate later if individual modules need to scale.

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Browser                        │
│                 React 19 + Vite + TypeScript                 │
│         Buyer Portal │ Sales Workspace │ Admin Console       │
└──────────────────────────┬──────────────────────────────────┘
                           │  HTTPS / REST (JSON)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                     FastAPI Application                      │
│  ┌──────────┐  ┌────────┐  ┌──────────┐  ┌──────────────┐  │
│  │   Auth   │  │ Leads  │  │   AI     │  │  Analytics   │  │
│  │  Module  │  │ Module │  │Assistant │  │  Dashboard   │  │
│  └──────────┘  └────────┘  └──────────┘  └──────────────┘  │
│  ┌──────────┐  ┌────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Projects │  │Bookings│  │Follow-ups│  │Notifications │  │
│  │ + Facts  │  │ + Slots│  │          │  │  + Templates │  │
│  └──────────┘  └────────┘  └──────────┘  └──────────────┘  │
│                                                             │
│  SQLAlchemy 2.0 ORM   ·   Alembic Migrations               │
└──────────────────────────┬──────────────────────────────────┘
                           │
               ┌───────────┴────────────┐
               │                        │
        ┌──────▼──────┐         ┌───────▼──────┐
        │  SQLite      │         │  Groq API    │
        │  (dev)       │         │  (AI LLM)    │
        │  PostgreSQL  │         └──────────────┘
        │  (prod)      │
        └─────────────┘
```

### Module Layout

```
backend/app/modules/
├── auth/           JWT auth, bcrypt hashing, role-based dependencies
├── users/          User CRUD, role assignment
├── projects/       Project + fact sheet + fact version management
├── leads/          Lead intake, status tracking, priority
├── ai_assistant/   Groq client, fact-grounded prompts, tool calling
├── conversations/  Conversation lifecycle, message history
├── messages/       Individual message storage and retrieval
├── bookings/       Visit slot generation, booking CRUD
├── handoffs/       Lead-to-sales escalation records
├── follow_ups/     Sales executive scheduled follow-up tasks
├── notifications/  Buyer + sales notifications with template engine
├── dashboard/      Aggregated analytics queries
└── settings/       System-wide configuration key-value store
```

Each module owns its own `models.py`, `schemas.py`, `repository.py`, `service.py`, and `router.py`. Cross-module communication goes through service calls, never direct model imports from another module's internals.

---

## 2. Data Model

### Entity Relationship Summary

```
roles ──< users ──< leads ──< lead_assignments >── users
                     │
                     ├──< conversations ──< messages
                     ├──< bookings >── visit_slots >── projects
                     ├──< handoffs >── users (sales)
                     ├──< follow_ups >── users (sales)
                     └──< notifications

projects ──< project_facts ──< fact_versions
projects ──< visit_slots ──< bookings
```

### Key Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `roles` | BUYER / SALES_EXECUTIVE / ADMIN role definitions | `id`, `name` |
| `users` | All user accounts across roles | `id`, `email`, `hashed_password`, `role_id`, `full_name`, `phone` |
| `projects` | Real-estate projects managed by Admin | `id`, `name`, `location`, `bhk_configs`, `is_active` |
| `project_facts` | Fact sheet per project (ground truth for AI) | `id`, `project_id`, `content`, `is_published` |
| `fact_versions` | History of fact sheet edits | `id`, `fact_id`, `content`, `created_at` |
| `leads` | A buyer's interest in a project | `id`, `buyer_id`, `project_id`, `status`, `source`, `priority` |
| `lead_assignments` | Maps a lead to a sales executive | `id`, `lead_id`, `sales_exec_id`, `assigned_at`, `is_active` |
| `conversations` | AI chat session linked to a lead | `id`, `lead_id`, `is_active` |
| `messages` | Individual chat messages | `id`, `conversation_id`, `role`, `content`, `language`, `created_at` |
| `visit_slots` | Available time slots per project | `id`, `project_id`, `slot_datetime`, `capacity`, `is_active` |
| `bookings` | A buyer's slot reservation | `id`, `lead_id`, `slot_id`, `status`, `created_at` |
| `handoffs` | Escalation from AI to sales exec | `id`, `lead_id`, `sales_exec_id`, `reason`, `created_at` |
| `follow_ups` | Scheduled tasks for sales execs | `id`, `lead_id`, `sales_exec_id`, `due_at`, `status`, `notes` |
| `notifications` | In-app notifications | `id`, `user_id`, `title`, `body`, `is_read`, `created_at` |
| `marketing_spends` | Monthly spend per channel for ROI analytics | `id`, `project_id`, `channel`, `month`, `amount` |
| `audit_logs` | Record of admin/system actions | `id`, `actor_id`, `action`, `resource_type`, `resource_id`, `details` |
| `system_settings` | App-wide config (key-value) | `id`, `key`, `value` |

### Referential Integrity Rules

- All foreign keys use `ON DELETE CASCADE` where child records have no meaning without the parent (e.g., messages without a conversation).
- `lead_assignments.is_active` enforces the rule that only one sales executive is active per lead at a time.
- `fact_versions` are append-only; the latest is always used by the AI.

---

## 3. Main Flows

### 3.1 Lead Intake → AI Conversation

```
Buyer registers  →  POST /auth/register
                        ↓
Buyer starts chat →  POST /leads/            (creates Lead: status=NEW)
                        ↓
                     POST /conversations/    (creates Conversation)
                        ↓
Buyer sends msg  →  POST /messages/          (stores USER message)
                        ↓
                     ai_assistant.service    (builds context, calls Groq)
                        ↓
                     stores ASSISTANT reply  →  returns to buyer
```

### 3.2 AI Handoff → Sales Executive

When the AI detects it cannot answer (missing fact) or the buyer requests a human:

```
AI response includes handoff_required=true
    ↓
handoffs.service creates Handoff record
    ↓
lead_assignments.service creates LeadAssignment for available sales exec
    ↓
notifications.service fires notification to sales exec
    ↓
lead.status updated: NEW → ASSIGNED
    ↓
Sales exec sees lead in their workspace
```

### 3.3 Site Visit Booking

```
Buyer views available slots  →  GET /visit-slots/?project_id=X
                                    ↓
Buyer selects slot           →  POST /bookings/
                                    ↓
Booking created (status=SCHEDULED)
                                    ↓
Notification sent to buyer + assigned sales exec
                                    ↓
Sales exec can mark: COMPLETED / NO_SHOW
Admin can view all bookings in calendar view
```

### 3.4 Admin Analytics Pipeline

All analytics are computed live from database aggregates — no pre-computed or cached metrics:

```
GET /dashboard/analytics
    ↓
dashboard.repository runs aggregate queries:
  - Lead counts grouped by status, source, project
  - Conversion rate = CONVERTED / total leads
  - Avg response time = mean(first_message.created_at - lead.created_at)
  - Revenue pipeline estimated from lead × project unit price
  - Monthly trend data from lead.created_at bucketed by week
    ↓
dashboard.service assembles DashboardResponse schema
    ↓
Frontend renders charts (Recharts)
```

---

## 4. AI Design

### Model & Provider

- **Provider:** Groq Cloud API
- **Model:** `openai/gpt-oss-120b` (via OpenAI-compatible endpoint)
- **Why Groq:** Ultra-low latency inference (~200ms) critical for real-time chat UX; free tier sufficient for prototype scale.

### Fact-Grounded Prompting

The AI never answers from general knowledge about real estate. Every response is grounded in the fact sheet of the specific project:

```python
system_prompt = f"""
You are Keylo AI, a friendly real-estate assistant for {project.name}.

APPROVED FACTS (use ONLY these to answer):
{published_fact_sheet.content}

RULES:
1. Never quote specific prices. Direct pricing questions to the sales team.
2. If a question cannot be answered from the APPROVED FACTS, say you will
   connect the buyer with a sales executive.
3. Answer in the same language the buyer uses (English / Hindi / Gujarati).
4. Keep responses concise — 2–4 sentences.
"""
```

### Tool Calling

The AI has access to two tools:
- `request_human_handoff(reason: str)` — triggered when AI cannot answer, buyer insists on human, or sensitive topic detected.
- `book_site_visit(preferred_date: str)` — triggered when buyer expresses interest in visiting; returns available slots.

Both tools are defined as structured JSON schemas and parsed from the model's tool-call response before saving to the database.

### Safeguards

| Rule | Enforcement |
|------|------------|
| No price quoting | System prompt instruction + fact sheet omits prices |
| Fact-only answers | System prompt restricts to `APPROVED FACTS` block |
| Language detection | Prompted; model mirrors buyer's input language |
| Handoff fallback | Hardcoded trigger when tool `request_human_handoff` fires |
| Conversation history | Last 10 messages passed as context to prevent repetition |

---

## 5. UI & Design Decisions

### Design System

| Token | Value | Usage |
|-------|-------|-------|
| Charcoal | `#1F2421` | Primary text, nav backgrounds |
| Ivory | `#FFFDF9` | Page backgrounds |
| Sand | `#FAFAF7` | Card surfaces |
| Forest Green | `#536B59` | Brand accent, CTAs |
| Amber | `#C5A77D` | Highlights, secondary accent |
| `DM Serif Display` | — | Headings, brand wordmark |
| `Manrope` | — | Body text, UI labels |

Tailwind CSS is configured with these as custom theme tokens so every component uses semantic class names rather than raw hex values.

### Three-Portal Layout

The application presents three distinct experiences, each at a separate route prefix:

| Portal | Route | Primary Users |
|--------|-------|--------------|
| Buyer | `/` and `/buyer/*` | Property seekers |
| Sales Workspace | `/sales/*` | Sales executives |
| Admin Console | `/admin/*` | Administrators |

A single login page at `/login` authenticates all roles and redirects to the appropriate portal based on the JWT `role` claim.

### Key Screens

**Buyer Portal**
- `/buyer/dashboard` — Lead status overview, upcoming bookings, notifications
- `/buyer/chat` — Multilingual AI chat with typing indicators and language badge
- `/buyer/visits` — Book, view and cancel site visits

**Sales Workspace**
- `/sales` — Lead queue, assignee filter, priority badges
- `/sales/follow-ups` — Chronological follow-up task list with status tracking
- `/sales/visits` — Booking calendar with status update controls

**Admin Console**
- `/admin` — Overview KPIs, today's activity summary
- `/admin/analytics` — Full analytics with trend charts, source breakdown, ROI
- `/admin/projects` — Project + fact sheet CRUD with version history
- `/admin/users` — User management, role assignment
- `/admin/visits` — System-wide booking management
- `/admin/settings` — System configuration, notification templates, audit logs

### Collapsible Sidebar

The Admin Console uses a collapsible left sidebar with icon-only collapsed state. This was chosen to maximise data density on analytics-heavy screens without sacrificing navigation discoverability.

---

## 6. What Was Cut

| Feature | Reason Deferred |
|---------|----------------|
| WhatsApp / SMS delivery | Requires Twilio/WATI integration + compliance approval; stored as notification records only |
| Email delivery | SMTP integration deferred; emails recorded in `notifications` table |
| Payment processing | Out of scope for lead-capture phase |
| Mobile apps (iOS/Android) | Web-first; responsive design covers mobile browsers |
| Outbound calling / voice AI | Significant infrastructure; not in scope |
| Full CRM (deal pipelines) | Keylo tracks leads to site-visit; post-visit is external |
| Multi-language fact sheets | Admin writes fact sheets in English; AI handles language switching in responses |
| Real-time chat via WebSockets | REST polling sufficient at demo scale; WebSockets planned for production |

---

## 8. What We Would Do Next

1. **WebSocket real-time chat** — Replace REST polling with WebSocket connections for instant message delivery.
2. **WhatsApp channel** — Integrate WATI or Interakt so buyers can chat via WhatsApp and messages sync to Keylo.
3. **Email & SMS delivery** — Connect SendGrid (email) and Twilio (SMS) to the existing `notifications` table.
4. **CI/CD pipeline** — GitHub Actions: lint → test → build → deploy on push to `main`. Playwright E2E tests cover buyer portal button flows.
5. **PostgreSQL in production** — Replace SQLite with a managed PostgreSQL instance (Railway, Supabase, or Neon).
6. **Mobile apps** — React Native with shared business logic from the TypeScript API client layer.
7. **Analytics export** — CSV/XLSX export for sales reports; Looker Studio connector.
8. **Multi-tenancy** — Isolate data per developer/builder organisation so the platform can serve multiple real-estate companies.

## 9. Testing

### Backend
- **229 Pytest tests** covering unit, integration, security, and AI assistant flows with mocked Groq provider.
- Key concurrency fix: `session.expire_all()` in `_project_is_active()` prevents SQLite `StaticPool` stale-snapshot failures in concurrent lead-creation tests.
- SQLAlchemy C extension disabled in tests (`SQLALCHEMY_USE_CEXTENSION=0`) to avoid thread-safety `IndexError` on shared in-memory SQLite.

### Frontend
- TypeScript strict typecheck + Vite production build.
- **Playwright E2E tests** (`frontend/playwright.config.ts`, `frontend/tests/e2e/chat-button.spec.ts`):
  - Chat button starts a new conversation from the Project Info page.
  - Continue Conversation button opens an existing conversation thread.
  - Quick inquiry chips populate the chat input field.
  - Navigation buttons route to correct pages.
- Runner: `npx playwright test`
- Chromium browser installed via Playwright.

---
