# Keylo --- Project Definition

**Project type:** AI-powered real-estate lead-response and site-visit
booking assistant\
**Selected problem statement:** PS3 --- Real estate developer's AI
lead-response and site-visit booking assistant\
**Status:** Initial project definition\
**Architecture:** Modular monolith

------------------------------------------------------------------------

## 1. Product Overview

Keylo helps a residential real-estate developer respond to buyer
enquiries quickly, understand buyer requirements, answer questions using
approved project information, arrange site visits in genuinely available
slots, and connect serious buyers with a named sales executive.

The initial product is a focused web application for buyers, sales
executives, and administrators. It is not intended to replace a full
CRM.

### Product objectives

1.  Capture leads and retain their source.
2.  Assist buyers through fact-grounded AI conversations.
3.  Collect buyer budget and requirements.
4.  Check real availability and book site visits safely.
5.  Hand serious buyers to a named sales executive with chat context.
6.  Provide basic source and conversion analytics.

## 2. Problem Context

The selected brief describes a developer receiving leads from property
portals, social media advertisements, the website, and a hoarding phone
number. Leads currently land in inboxes and spreadsheets, and follow-up
is delayed.

The brief gives these baseline assumptions:

-   3,000 leads per month.
-   Median first response time of 14 hours.
-   35% of leads are not reached within 48 hours.
-   Only 6% of leads visit a site.

The intended outcomes in the brief are:

-   Reduce median first response time to under 5 minutes.
-   Reduce leads not reached within 48 hours from 35% to under 5%.
-   Improve lead-to-site-visit rate from 6% to 8% within three months.

These are targets from the brief, not results claimed by this project.

## 3. Users and Roles

### Buyer

-   Submit an enquiry.
-   Chat with the AI assistant in the web application.
-   Ask about the developer's projects.
-   Share budget and requirements.
-   Request a human sales representative at any time.
-   View and manage a site-visit booking.

### Sales Executive

-   View assigned leads.
-   Review buyer details and conversation history.
-   Receive handoffs with an AI-generated summary.
-   Follow up with buyers.
-   View assigned site visits and update visit outcomes.

### Admin / Sales Head

-   Manage users and role assignments.
-   Manage project fact sheets.
-   Manage site-visit slots.
-   Review flagged conversations and handoffs.
-   View dashboard metrics.

The brief identifies buyers, sales executives, and the sales head as
users. Admin capabilities support the required fact-sheet and slot
editor.

## 4. Scope

### 4.1 MVP capabilities

1.  **Authentication and access control**
    -   Secure sign-in.
    -   Role-based access for buyer, sales executive, and admin.
2.  **Lead management**
    -   Unified lead list.
    -   Lead source tags.
    -   Duplicate checks.
    -   Lead assignment and status tracking.
3.  **Projects and fact sheets**
    -   Project information maintained in an admin-editable fact sheet.
    -   AI answers grounded in approved facts.
    -   Fact-sheet editing through the application.
4.  **AI buyer chat**
    -   Web chat, with English, Hindi, or Gujarati support as feasible
        within the MVP.
    -   Collect buyer budget and requirements.
    -   Use backend tools to check availability and request bookings.
    -   Allow buyers to request a person at any time.
5.  **Site-visit booking**
    -   Admin-managed visit slots.
    -   Display genuinely available slots.
    -   Confirm bookings safely.
    -   Prevent overbooking.
    -   Show the visit location pin.
    -   Create reminders for one day and two hours before the visit.
6.  **Human handoff**
    -   Assign a serious buyer to a named sales executive.
    -   Include conversation history and a concise summary.
    -   Track handoff status.
7.  **Dashboard**
    -   Response time.
    -   Site visits.
    -   Show-up rate.
    -   Cost per visit by lead source.

### 4.2 Out of scope

-   Full CRM replacement.
-   Booking payments.
-   Allotment letters.
-   Outbound voice calling.
-   WhatsApp integration in the initial release.
-   External CRM integrations.
-   Property-owner listings, public property discovery, or an agent
    marketplace.

The initial channel is web chat. WhatsApp may be considered later.

## 5. Technology Stack

  -----------------------------------------------------------------------
  Layer                   Technology              Purpose
  ----------------------- ----------------------- -----------------------
  Frontend                React + TypeScript      Responsive web
                                                  application

  Styling                 Tailwind CSS            UI styling

  Backend                 Python + FastAPI        API and business logic

  Database                PostgreSQL              Persistent application
                                                  data

  ORM                     SQLAlchemy              Database mapping and
                                                  queries

  Migrations              Alembic                 Version-controlled
                                                  schema changes

  AI provider             Groq API                Language-model
                                                  responses and tool
                                                  calls

  Authentication          JWT and secure password Sign-in and API access
                          hashing                 

  Backend tests           Pytest                  Unit and integration
                                                  tests

  Frontend tests          React Testing Library   UI and interaction
                                                  tests

  Local environment       Docker Compose          Reproducible local
                                                  services
  -----------------------------------------------------------------------

The AI provider should be accessed through a small provider abstraction
so another model provider can be added later without rewriting the
conversation and business logic.

## 6. Architecture

### 6.1 Architectural style

Keylo will start as a **modular monolith**:

-   One FastAPI application.
-   One PostgreSQL database.
-   Business capabilities organized into independent modules.
-   Clear boundaries between API routes, business services, and data
    access.
-   No microservices in the assignment MVP.

This keeps deployment manageable while leaving room to extract a module
into a separate service if future scale or operational needs justify it.

### 6.2 High-level component flow

``` text
Buyer / Sales Executive / Admin
              |
              v
     React + TypeScript UI
              |
              v
        FastAPI REST API
              |
      +-------+--------------------------------+
      |       |          |          |          |
      v       v          v          v          v
    Auth    Leads    Conversations Bookings  Handoffs
                         |
                         v
                  AI Assistant Service
                         |
                         v
                      Groq API
                         |
                  Controlled tool calls
                         |
          +--------------+----------------+
          |              |                |
          v              v                v
      Project Facts  Availability    Human Handoff
          |              |
          +--------------+----------------+
                         |
                         v
                 PostgreSQL Database
```

The model does not connect directly to PostgreSQL. The backend validates
and executes approved tools, then returns their results to the AI
workflow.

### 6.3 Backend module boundaries

  -----------------------------------------------------------------------
  Module                              Responsibility
  ----------------------------------- -----------------------------------
  `auth`                              Sign-in, token handling,
                                      authentication

  `users`                             User profiles, roles, and access
                                      rules

  `projects`                          Projects and approved fact sheets

  `leads`                             Lead intake, source, duplicate
                                      checks, assignment, status

  `conversations`                     Conversation and message history

  `ai_assistant`                      AI orchestration, provider adapter,
                                      prompts, tool definitions,
                                      validation

  `bookings`                          Visit slots, availability, booking,
                                      cancellation and visit outcome

  `handoffs`                          Named executive assignment and
                                      conversation summary

  `notifications`                     In-app notifications and reminder
                                      records

  `dashboard`                         Aggregated operational and source
                                      metrics
  -----------------------------------------------------------------------

## 7. Data and Database Design

Use one PostgreSQL database named `keylo_db`. These are logical table
groups in the same database, not separate databases.

  Area            Initial tables
  --------------- ------------------------------
  Identity        `users`, `roles`
  Projects        `projects`, `project_facts`
  Leads           `leads`, `lead_assignments`
  Conversations   `conversations`, `messages`
  Bookings        `visit_slots`, `site_visits`
  Handoffs        `handoffs`
  Notifications   `notifications`

Relationships and constraints will be finalized during database design.
Use foreign keys for relationships and migrations for schema changes.

### Important data rules

-   A lead should be associated with the relevant project where
    applicable.
-   A conversation belongs to a lead.
-   Messages belong to a conversation and retain sender/type and
    timestamp.
-   A booking refers to a visit slot and a lead.
-   Handoffs identify the assigned sales executive and retain relevant
    conversation context.
-   Project facts must be distinguishable from unapproved or draft
    content.
-   Store timestamps consistently and display them in the appropriate
    local timezone.

## 8. AI Behaviour and Safety Rules

The AI assistant is a controlled application workflow, not an
unrestricted chatbot.

### Approved behaviour

-   Answer project questions only from the sales head's approved fact
    sheet.
-   Ask useful questions to understand budget and buyer requirements.
-   Use backend tools for actions such as checking slots and requesting
    a booking.
-   Summarize the conversation when handing a buyer to a sales
    executive.

### Required safeguards

-   If a required fact is missing, do not guess. Tell the buyer a person
    will confirm and create a handoff.
-   Never quote a final price or discount.
-   Buyers can request a human at any time.
-   Validate tool arguments and permissions in the backend.
-   Do not let model output bypass booking validation or authorization.
-   Preserve the original conversation for the sales executive.
-   Treat AI-generated summaries as assistance; original messages remain
    available.

### Initial tool candidates

-   `get_project_facts`
-   `capture_buyer_requirements`
-   `get_available_slots`
-   `book_site_visit`
-   `request_human_handoff`

Tool contracts and permissions will be defined when implementing the AI
module.

## 9. Booking Correctness

Preventing double booking is a core engineering requirement.

-   Availability must be read from persisted slot and booking data.
-   The backend must revalidate availability when confirming a booking.
-   Booking creation must be transactional.
-   Database constraints or locking must protect against concurrent
    requests for the same slot capacity.
-   A slot must never be treated as available merely because it appeared
    available in an earlier frontend response.
-   Conflicting booking attempts should return a clear response and
    allow the buyer to choose another slot.

The exact schema and concurrency strategy will be selected during
booking module design.

## 10. Notifications and Reminders

The brief requires reminders one day and two hours before a site visit,
but does not require a specific external email, SMS, or messaging
provider.

Initial implementation:

-   Store notification and reminder records in PostgreSQL.
-   Use a background scheduling mechanism to identify due reminders.
-   Provide in-app notification visibility.
-   Use mock delivery/logging for the demo if an external channel is not
    configured.

External email, SMS, and WhatsApp integrations are not part of the
initial MVP.

## 11. Privacy, Compliance, and Security

-   Collect and use buyer contact details only with appropriate consent.
-   Honour opt-outs for contact and follow-up.
-   Do not commit real personal data or secrets to the repository.
-   Restrict lead and conversation access by role and assignment.
-   Protect credentials with secure password hashing.
-   Keep secrets in environment variables.
-   Record important administrative and booking actions where
    appropriate.
-   Promotional content must include the project registration number and
    must not make claims beyond registered details.
-   Do not send WhatsApp business messages in the MVP; future WhatsApp
    support must respect opt-in and approved templates.
-   Administrators can hard-delete projects and facts (refused while
    dependent records such as leads, bookings, or conversations exist).
-   Access sessions can be revoked server-side: login issues a refresh
    token, and logout/revoke-all revokes all refresh tokens for a user.
    Revoked access tokens are rejected before they expire via a JTI
    revocation list.

This is an assignment prototype. Production legal and compliance review
would be required before real customer deployment.

## 12. Quality and Testing Strategy

Testing will be added with each module rather than postponed until the
end.

### Backend

-   Unit tests for business rules and services.
-   API tests for validation, authorization, and response behaviour.
-   Database integration tests for relationships and constraints.
-   AI tests using mocked provider responses and tool calls.
-   Booking concurrency tests for double-booking prevention.

### Frontend

-   Component and form validation tests.
-   Authentication and role-based UI tests.
-   Lead, chat, booking, and handoff flow tests.

### End-to-end

-   Buyer submits an enquiry.
-   Lead is saved and deduplicated.
-   Buyer asks a question and receives a fact-grounded answer.
-   Buyer checks and books an available visit slot.
-   A conflicting booking is rejected.
-   Buyer requests a human and a named executive receives the handoff.
-   Dashboard reflects seeded and newly created records.

## 13. Development Sequence

Build and verify one module at a time:

1.  Backend foundation --- FastAPI, configuration, database connection,
    migrations, logging, error handling, health check, and test setup.
2.  Authentication and users.
3.  Projects and fact sheets.
4.  Lead management.
5.  Conversations and messages.
6.  AI assistant and controlled tools.
7.  Availability and bookings.
8.  Human handoff.
9.  Notifications and reminders.
10. Dashboard and analytics.

Frontend integration and end-to-end verification will follow the
relevant backend contracts.

## 14. Repository and Engineering Practices

-   Keep modules cohesive and avoid circular dependencies.
-   Keep HTTP routing separate from business logic and database access.
-   Use request and response schemas at API boundaries.
-   Use database migrations for schema changes.
-   Add tests for important business rules and regressions.
-   Keep configuration environment-based.
-   Maintain meaningful Git commits and a readable README.
-   Document assumptions and known limitations honestly.
-   Avoid adding infrastructure or abstractions without a current
    requirement.

## 15. Future Extension Ideas --- Not MVP Commitments

Potential future capabilities include:

-   WhatsApp as an additional conversation channel.
-   Additional AI providers.
-   More advanced lead scoring and routing.
-   Multiple developer organizations or tenant isolation.
-   Property-owner listings and buyer property discovery.
-   Agent service workflows.
-   Additional notification delivery channels.

These are future possibilities only. The MVP should not implement them
unless the core workflow is already reliable.

## 16. Definition of Done

A module is complete when:

-   Its responsibility and API contract are documented.
-   Its business logic is implemented in the appropriate service layer.
-   Database changes are represented by migrations where needed.
-   Authentication and authorization are enforced where applicable.
-   Positive, negative, and important edge cases are tested.
-   Errors are handled predictably.
-   The module integrates with existing modules without bypassing their
    boundaries.
-   Its limitations and assumptions are documented.

**Guiding principle:** Build a small, polished, reliable end-to-end
product. Prefer correctness, clear design, and maintainable code over
unnecessary complexity.
