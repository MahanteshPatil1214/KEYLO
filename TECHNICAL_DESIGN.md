# Keylo — Technical Design Document

**Project URL:** https://github.com/MahanteshPatil1214/KEYLO  
**Live app:** Not deployed (local/Docker Compose only — see `deployment.md`)  
**Status:** Assignment submission — modular monolith MVP  
**Problem Statement:** PS3 — Real estate developer's AI lead-response and site-visit booking assistant

---

## Assumptions

Every assumption below is labelled **[ASSUMPTION]** and is not a claim about the original problem statement.

1. **[ASSUMPTION]** The GitHub repository is public and will remain public for the review period.
2. **[ASSUMPTION]** No live deployment URL exists; the application runs locally via Docker Compose or directly on `localhost`.
3. **[ASSUMPTION]** The backend uses SQLite for local development and PostgreSQL for production/Docker Compose.
4. **[ASSUMPTION]** All demo account credentials are for local development only and are not production secrets.
5. **[ASSUMPTION]** The AI assistant uses the Groq API (`openai/gpt-oss-120b` model) via a provider abstraction layer.
6. **[ASSUMPTION]** DPDP (Digital Personal Data Protection Act, 2023) compliance is implemented via consent capture at registration and an opt-out mechanism for leads.

---

## 1. GitHub and Live App Links

| Item | Value |
|------|-------|
| GitHub repository | https://github.com/MahanteshPatil1214/KEYLO |
| Live app | Not deployed (run locally via `docker compose up` or manual setup) |
| API docs (local) | http://localhost:8000/docs |
| Frontend (local) | http://localhost:5173 |

---

## 2. Architecture and Rationale

### 2.1 Architectural Style: Modular Monolith

Keylo is implemented as a **modular monolith**:

- One FastAPI application serving all REST endpoints
- One relational database (SQLite in dev, PostgreSQL in production/Docker)
- Business capabilities organized into independent domain modules
- Clear separation between API routes, business services, and data access layers
- No microservices in the MVP

**[ASSUMPTION]** A modular monolith was chosen because it keeps deployment manageable for a single-team assignment, enforces clear module boundaries, and leaves room to extract individual modules into separate services later if scale or operational needs justify it.

### 2.2 High-Level Component Flow

```
Client Browsers (Buyer, Sales Executive, Admin)
        |
        v
React 19 + TypeScript UI (Vite)
        |
        v
FastAPI REST API (ASGI, /api/v1)
        |
        +--- Auth (JWT + RBAC)
        +--- Leads (intake, duplicate checks, assignment, DPDP opt-out)
        +--- Conversations & Messages
        +--- AI Assistant (Groq API + fact-grounded prompts)
        +--- Bookings (visit slots, availability, overbooking prevention)
        +--- Handoffs (named executive assignment + summary)
        +--- Notifications & Reminders
        +--- Dashboard & Analytics
        +--- Users & Projects
        |
        v
PostgreSQL (production) / SQLite (development)
```

### 2.3 Why This Architecture

| Concern | Decision | Rationale |
|---------|----------|-----------|
| Backend framework | FastAPI | Async-capable, automatic OpenAPI docs, Pydantic v2 validation, strong Python ecosystem |
| Frontend | React 19 + TypeScript + Vite | Type safety, fast dev server (HMR), modern component model |
| Styling | Tailwind CSS 4.x | Utility-first, consistent design system, small CSS bundle |
| Database | SQLAlchemy 2.0 + Alembic | ORM abstraction, migration versioning, PostgreSQL/SQLite dual support |
| Authentication | JWT (HS256) + role-based guards | Stateless, scalable, role isolation (ADMIN / SALES_EXECUTIVE / BUYER) |
| AI provider | Groq API (`openai/gpt-oss-120b`) | Fast inference, provider-abstraction ready for swapping models |
| Containerization | Docker Compose | Reproducible local services (PostgreSQL + backend + frontend) |
| Testing | Pytest (229 backend tests) + Playwright E2E | Unit + integration + headless browser verification |

### 2.4 Backend Module Boundaries

| Module | Responsibility |
|--------|---------------|
| `auth` | Sign-in, JWT token handling, authentication middleware |
| `users` | User profiles, roles, access rules |
| `projects` | Projects and approved RERA fact sheets |
| `leads` | Lead intake, source tags, duplicate checks, assignment, status, DPDP opt-out |
| `conversations` | Conversation and message history |
| `ai_assistant` | AI orchestration, provider adapter, prompts, tool definitions, validation |
| `bookings` | Visit slots, availability, booking, cancellation, visit outcome |
| `handoffs` | Named executive assignment, conversation summary |
| `notifications` | In-app notifications, 24h / 2h visit reminders |
| `dashboard` | Aggregated operational and source metrics |
| `follow_ups` | Follow-up scheduling and tracking |
| `settings` | System settings, notification templates, audit logs |
| `messages` | Message storage and retrieval |

---

## 3. Data Model

### 3.1 Core Entity Relationships

```
users (id, email, password_hash, full_name, role, is_active, is_verified, created_at)
    |
    +-- leads (assigned_executive_id -> users.id)
    |
    +-- conversations (buyer_id -> users.id)
    |
    +-- bookings (buyer_id -> users.id, executive_id -> users.id)

projects (id, name, slug, location, rera_number, status, created_by)
    |
    +-- project_facts (project_id -> projects.id)
    |
    +-- leads (project_id -> projects.id)
    |
    +-- visit_slots (project_id -> projects.id)

leads (id, full_name, email, phone, project_id, source, status,
       consent_to_contact, opted_out, opted_out_at, opted_out_reason,
       budget_min, budget_max, preferred_configuration, created_at)
    |
    +-- conversations (lead_id -> leads.id)
    |
    +-- lead_assignments (lead_id -> leads.id, executive_id -> users.id)
    |
    +-- bookings (lead_id -> leads.id)
    |
    +-- handoffs (lead_id -> leads.id)

conversations (id, lead_id, project_id, buyer_id, status, created_at, updated_at)
    |
    +-- messages (conversation_id -> conversations.id)

bookings (id, slot_id, lead_id, project_id, buyer_id, executive_id,
          status, cancellation_reason, created_at, updated_at)

handoffs (id, conversation_id, lead_id, project_id, executive_id,
          reason, summary, status, created_at, updated_at)

notifications (id, user_id, type, title, message, is_read, created_at)
```

### 3.2 Key Data Rules (from PROJECT.md)

- A lead is associated with a relevant project where applicable.
- A conversation belongs to a lead; messages belong to a conversation and retain sender/type/timestamp.
- A booking refers to a visit slot and a lead.
- Handoffs identify the assigned sales executive and retain conversation context.
- Project facts must be distinguishable from unapproved/draft content.
- Timestamps stored consistently and displayed in local timezone.
- DPDP: `consent_to_contact`, `opted_out`, `opted_out_at`, `opted_out_reason` fields on `leads`.

---

## 4. Main Flows

### 4.1 Buyer Enquiry Flow

1. Buyer visits the public site and submits an enquiry via the lead intake form.
2. Backend validates project is active, checks for duplicate contact (email/phone), creates lead with `consent_to_contact`.
3. Lead is created in `NEW` status. If `consent_to_contact` is false, `opted_out` is set to true.
4. Buyer can start a conversation with the AI assistant.

### 4.2 AI Conversation Flow

1. Buyer sends a message in the web chat.
2. AI assistant retrieves approved project facts from `project_facts`.
3. Model responds grounded only in approved facts — no guessing, no final pricing.
4. If a required fact is missing, the AI offers a human handoff instead of guessing.
5. Buyer can request `get_available_slots` or `book_site_visit` via backend-validated tool calls.
6. Buyer can request `request_human_handoff` at any time.

### 4.3 Site Visit Booking Flow

1. Admin creates visit slots with capacity and time windows.
2. Buyer views genuinely available slots (backend revalidates at booking time).
3. Booking created transactionally — slot capacity decremented atomically.
4. Double-booking prevented via database constraints/locking and backend revalidation.
5. Automated reminders scheduled at 24h and 2h before the visit.

### 4.4 Human Handoff Flow

1. Buyer requests a human, or AI determines handoff is needed (missing fact, serious buyer).
2. Conversation assigned to a named sales executive.
3. AI-generated summary + full conversation history passed to executive.
4. Handoff status tracked (PENDING / ASSIGNED / IN_PROGRESS / RESOLVED / CANCELLED).

### 4.5 DPDP Opt-Out Flow (New)

1. Buyer registers — consent checkbox captured once at sign-up (not on every login).
2. Buyer visits **My Profile → Security & Privacy → DPDP contact consent**.
3. Buyer clicks "Opt out of contact", confirms in dialog, optional reason.
4. Backend matches leads by buyer email, sets `opted_out=true`, `opted_out_at`, `opted_out_reason`, `consent_to_contact=false`.
5. No further calls, emails, WhatsApp messages, or visit reminders initiated for opted-out leads.
6. Sales executives see an "Opted out" badge in the lead table and cannot assign or move opted-out leads to contact-requiring statuses.

---

## 5. AI Behaviour and Safety

### 5.1 Approved Behaviour

- Answer project questions only from the sales head's approved fact sheet.
- Ask useful questions to understand budget and buyer requirements.
- Use backend tools for actions (checking slots, requesting bookings, handoffs).
- Summarize conversation when handing buyer to a sales executive.

### 5.2 Required Safeguards

- If a required fact is missing → do not guess; tell buyer a person will confirm and create a handoff.
- Never quote a final price or discount.
- Buyers can request a human at any time.
- Validate tool arguments and permissions in the backend.
- Model output cannot bypass booking validation or authorization.
- Original conversation preserved for the sales executive.
- AI-generated summaries are assistance; original messages remain available.

### 5.3 AI Tools

| Tool | Purpose |
|------|---------|
| `get_project_facts` | Retrieve approved project information |
| `capture_buyer_requirements` | Collect budget and configuration preferences |
| `get_available_slots` | Check genuinely available visit slots |
| `book_site_visit` | Transactional booking with capacity enforcement |
| `request_human_handoff` | Escalate to named sales executive |

**[ASSUMPTION]** The AI provider abstraction allows swapping Groq for another provider without rewriting conversation logic.

---

## 6. UI and Design Decisions

### 6.1 Key Screens

| Screen | Audience | Purpose |
|--------|----------|---------|
| Landing page (`/`) | Public | Hero, challenges, product showcase, workflow, benefits, demo CTA |
| Login (`/login`) | All roles | Secure sign-in with JWT session |
| Register (`/register`) | Buyers | Account creation with one-time privacy consent |
| Privacy Policy (`/privacy`) | Public | DPDP notice: data collected, usage, rights, contact |
| Buyer Dashboard (`/buyer`) | Buyer | Overview of enquiries, visits, conversations |
| My Profile (`/buyer/profile`) | Buyer | Account details, verification status, **DPDP opt-out** |
| Conversations (`/buyer/conversations`) | Buyer | AI chat threads |
| Site Visits (`/buyer/visits`) | Buyer | View and manage bookings |
| Project Info (`/buyer/project`) | Buyer | Approved project facts |
| Sales Dashboard (`/sales`) | Sales Executive | Lead queue, priority follow-ups, conversions |
| Leads (`/sales/leads`) | Sales Executive | Lead table with "Opted out" badges, detail drawer |
| Lead Detail Drawer | Sales Executive | Full lead record, status updates, **DPDP opt-out action** |
| Admin Console (`/admin`) | Admin | User management, projects, visits, analytics, settings |

### 6.2 Design Decisions

- **Role-based layouts**: Buyer, Sales, and Admin each have dedicated layouts with scoped navigation.
- **Tailwind CSS 4.x**: Utility-first styling ensures consistency across portals with minimal custom CSS.
- **Lead detail drawer**: Slide-out panel preserves context while viewing lead details without leaving the lead list.
- **Status pills + priority dots**: Visual scanning for lead urgency and pipeline stage.
- **DPDP opt-out badge**: Alert-circle icon + "Opted out" label in lead table so sales staff never contact opted-out buyers.
- **Confirmation dialog**: Opt-out requires explicit confirmation to prevent accidental withdrawals.
- **Consent once at registration**: Privacy checkbox appears only on `RegisterPage`, not on every login.

### 6.3 Accessibility

- Skip-to-content links on all pages.
- ARIA labels on interactive elements.
- Keyboard-navigable drawers and modals (focus trapping, Escape to close).
- Sufficient colour contrast ratios.
- `prefers-reduced-motion` respected for animations.

---

## 7. What Was Cut (Out of Scope)

From PROJECT.md Section 4.2 and subsequent scoping decisions:

| Cut Item | Reason |
|----------|--------|
| Full CRM replacement | MVP is a focused web app, not a CRM |
| Booking payments | Not part of the brief |
| Allotment letters | Post-visit legal document, out of MVP |
| Outbound voice calling | Not a supported channel |
| WhatsApp integration | Future channel; initial channel is web chat |
| External CRM integrations | Not in MVP |
| Property-owner listings / agent marketplace | Different product scope |
| Real email/SMS notification delivery | Mock delivery/logging for demo; in-app notifications stored |
| Multiple developer organizations / tenant isolation | Single-developer MVP |

---

## 8. What to Do Next

| Priority | Item | Rationale |
|----------|------|-----------|
| High | Deploy to a staging environment with real PostgreSQL | Currently local/Docker only |
| High | Production security review (secrets rotation, CORS, rate limiting) | Assignment prototype, not production-ready |
| Medium | WhatsApp channel integration | Most-requested future channel from brief |
| Medium | Advanced lead scoring and routing | Improve executive efficiency |
| Medium | Additional AI provider options | Reduce single-provider dependency |
| Low | Property-owner listings and buyer property discovery | Separate product scope |
| Low | Allotment letters and payment integration | Post-MVP legal/commercial features |

---

## 9. Quality and Testing

- **229 backend tests** (Pytest): unit, integration, security, AI assistant unit tests with mocked provider.
- **Frontend**: TypeScript strict typecheck + Vite production build.
- **E2E verification**: Playwright headless browser tests covering buyer portal buttons and user flows:
  - "Chat with Keylo Concierge" button starts a new conversation from the Project Info page.
  - "Continue Conversation" button opens an existing conversation thread.
  - Quick inquiry chips (Amenities, Configurations, etc.) populate the chat input field.
  - Navigation buttons (Overview, Conversations, Profile) route to the correct pages.
- **Booking concurrency**: Double-booking prevention tested via concurrent request scenarios.
- **DPDP opt-out**: Backend service logic + frontend UI verified through existing test patterns.

**Playwright Setup:**
- Configuration: `frontend/playwright.config.ts` (Chromium project, Vite dev server integration)
- Test location: `frontend/tests/e2e/chat-button.spec.ts`
- Runner: `npx playwright test`
- CI: Playwright E2E tests are available to add to the GitHub Actions workflow; backend and frontend jobs already pass on every push.

---

## 10. Repository Hygiene

- No secrets committed to the repository (all secrets via environment variables).
- No real personal data in the repository.
- Meaningful Git commit history preserved (8 commits for this feature set).
- `.gitignore` excludes `__pycache__`, `*.pyc`, `*.db`, `frontend/dist/`, `node_modules/`, `.env`.

---