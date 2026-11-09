# Troubleshooting & Build Errors — Keylo Backend/Frontend

This document records all errors, difficulties, and failures encountered during development and CI/CD, along with their root causes and fixes.

---

## 1. CI/CD Failures

### 1.1 `docker-build` job failing — missing `backend/.env`

**Symptom:**
```
Run docker compose config --quiet
env file /home/runner/work/KEYLO/KEYLO/backend/.env not found: stat /home/runner/work/KEYLO/KEYLO/backend/.env: no such file or directory
Error: Process completed with exit code 1.
```

**Root Cause:**
The CI workflow (`backend/tests/.github/workflows/ci.yml`) ran `docker compose config --quiet`, which requires `backend/.env` to exist on the runner. The `.env` file is gitignored (contains secrets like JWT keys, DB passwords) and is not committed to the repository, so it does not exist on the GitHub Actions runner.

**Fix:**
Removed the `docker compose config --quiet` step from the `docker-build` job in `.github/workflows/ci.yml`. The compose file syntax is validated implicitly by `docker compose --profile seed build` — if the compose file is invalid, the build step will fail anyway.

**Commit:** `7663c63` — fix: remove docker compose config step requiring .env in CI

---

### 1.2 `backend-tests` job failing — `IndexError: tuple index out of range`

**Symptom:**
```
FAILED tests/integration/test_leads.py::test_concurrent_duplicate_creation - IndexError: tuple index out of range
```
Occurred deep inside SQLAlchemy's C extension (`sqlalchemy/cyextension/resultproxy.pyx`) during concurrent access to an in-memory SQLite database (`StaticPool`).

**Root Cause:**
SQLAlchemy's C extension (cyextension) is not thread-safe for concurrent access to a shared in-memory SQLite connection used by the isolated test suite. Two threads calling `create_lead` concurrently can cause row-processor index errors when reading result rows.

**Fix:**
Added `SQLALCHEMY_USE_CEXTENSION=0` to the test environment in `backend/tests/conftest.py`. This forces SQLAlchemy to use the pure-Python result processor, which is thread-safe for concurrent SQLite access. The environment variable is set before SQLAlchemy is imported.

**Commit:** Part of `0d72c53` / `32f7300` series — conftest.py change

---

### 1.3 `backend-tests` job failing — race condition (`404` vs `409`)

**Symptom:**
```
FAILED tests/integration/test_leads.py::test_concurrent_duplicate_creation
E   assert [201, 404] == [201, 409]
E      At index 1 diff: 404 != 409
```

**Root Cause:**
The test `test_concurrent_duplicate_creation` submits two concurrent requests to create leads with the same phone number for the same project. One request should get `201` (created) and the other `409` (duplicate). However, `_project_is_active()` was called outside the contact lock, and SQLite's in-memory `StaticPool` can return stale snapshots to concurrent threads. One thread saw the project as missing (`404 ProjectNotFoundError`) instead of proceeding to the duplicate check (`409 DuplicateLeadError`).

**Fix:**
Added `session.expire_all()` at the start of `_project_is_active()` in `backend/app/modules/leads/service.py`. This forces SQLAlchemy to expire all cached instances and fetch fresh project data from the database, ensuring concurrent threads see consistent data.

**Verification:** 10/10 consecutive runs of `test_concurrent_duplicate_creation` pass.

**Commit:** `839b1b5` — fix: fix concurrent lead creation race on SQLite

---

### 1.4 Full test suite — 224 → 229 tests

After adding the one-click conversation endpoint, 5 new integration tests were added (`test_conversations.py`). All 229 tests pass locally and on CI.

---

## 2. Frontend Issues

### 2.1 Markdown asterisks (`**`) showing literally in AI responses

**Symptom:**
AI assistant responses displayed literal `**` symbols instead of bold text:
```
**RERA Registration No.:** PR/GJ/AHMEDABAD/AHMEDABAD CITY/AUDA/RAA12345/010126
```

**Root Cause:**
In `frontend/src/buyer/conversation/ChatArea.tsx`, AI assistant message content was rendered as plain text inside a `<p>` tag:
```tsx
<p className="whitespace-pre-line break-words text-[0.84rem] sm:text-[0.88rem]">
  {msg.content}
</p>
```
React renders `**` as literal characters, not Markdown.

**Fix:**
Installed `react-markdown` and `remark-gfm`, added a `MarkdownMessage` component that renders AI assistant messages as Markdown:
```tsx
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MarkdownMessage = ({ content }) => (
  <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    p: ({ children, ...props }) => <p {...props} className="whitespace-pre-line break-words text-[0.84rem] sm:text-[0.88rem]" />
  }}>
    {content}
  </ReactMarkdown>
);
```
Only AI assistant messages (`sender_type === "AI_ASSISTANT"`) use Markdown rendering; buyer and sales executive messages remain plain text.

**Commit:** `32f7300` — fix: render AI assistant messages as Markdown so bold formatting renders

---

### 2.2 No chat button on ProjectInfoPage

**Symptom:**
Buyers could only chat from `/buyer/conversations` if a conversation already existed. There was no way to start a chat directly from a project page.

**Fix:**
- Added `POST /api/v1/conversations/start` backend endpoint (`backend/app/modules/conversations/router.py`, `service.py`, `schemas.py`) that creates a lead (if needed) and conversation for a project in one call.
- Added `startBuyerConversation()` API function in `frontend/src/buyer/api.ts`.
- Added a "Chat with Keylo Concierge" button on `frontend/src/buyer/ProjectInfoPage.tsx` that calls the endpoint and navigates to `/buyer/conversations?conversation_id=...`.
- Updated `ConversationsPage.tsx` to auto-select the conversation from the URL `?conversation_id=` parameter and refetch conversations if the new one isn't in the cached list yet.

**Commit:** `0d72c53` — feat: add one-click start conversation from project page

---

### 2.3 Frontend build failing due to corrupted `node_modules`

**Symptom:**
```
npm error code EPERM
npm error syscall unlink
npm error path E:\KEYLO\frontend\node_modules\lightningcss-win32-x64-msvc\lightningcss.win32-x64-msvc.node
```
And subsequently:
```
Build failed with 24 errors:
[UNLOADABLE_DEPENDENCY] Could not load node_modules/micromark-util-character/index.js
```

**Root Cause:**
A Windows file-lock (EPERM) during `npm ci` left `node_modules` in a corrupted/partial state. Removing `package-lock.json` and `node_modules` and running a fresh `npm install` resolved it.

**Fix:** Reinstalled dependencies from the committed `package-lock.json`.

---

## 3. Playwright E2E Test Setup

Added Playwright for end-to-end testing of buyer portal buttons:

- `frontend/playwright.config.ts` — Chromium project, Vite dev server integration
- `frontend/tests/e2e/chat-button.spec.ts` — Tests for:
  - Chat button starts a new conversation from project page
  - Continue conversation button opens existing thread
  - Quick inquiry chips populate input field
  - Navigation buttons route to correct pages

**Commits:** `a8ad343` + `ffc9c8e`

---

## 4. CI/CD Pipeline Summary

The GitHub Actions workflow (`.github/workflows/ci.yml`) has three jobs:

| Job | Purpose | Status |
|-----|---------|--------|
| `backend-tests` | Run 229 backend tests on Python 3.12 + 3.13 with PostgreSQL service | ✅ Passing |
| `frontend-build` | TypeScript check + Vite production build | ✅ Passing |
| `docker-build` | Build backend, frontend, and seed Docker images | ✅ Passing |

---

## 5. Common Commands

### Backend
```powershell
# Run all tests
.\.venv\Scripts\python -m pytest tests -q --tb=short

# Run specific flaky test repeatedly
for ($i=0; $i -lt 10; $i++) { .\.venv\Scripts\python -m pytest tests/integration/test_leads.py::test_concurrent_duplicate_creation -q --tb=line }
```

### Frontend
```powershell
# TypeScript check + build
npm run build

# Dev server
npm run dev

# Playwright E2E tests
npx playwright test
```

---

## 6. Lessons Learned

1. **Never commit `.env` files** — they contain secrets and break CI when absent. Validate compose files via `docker compose build` instead of `docker compose config --quiet`.
2. **SQLAlchemy C extension is not thread-safe** for concurrent SQLite `StaticPool` access in tests — use `SQLALCHEMY_USE_CEXTENSION=0` in test environments.
3. **SQLite in-memory databases can return stale snapshots** across threads — use `session.expire_all()` before critical reads in concurrent scenarios.
4. **React renders `**` as literal text** — use `react-markdown` + `remark-gfm` for AI assistant responses that contain Markdown formatting.
5. **Always verify CI is running on the latest commit** — if a job still fails, check the GitHub Actions "Jobs" page for the exact error.

---

*Document last updated: 2026-11-09*
