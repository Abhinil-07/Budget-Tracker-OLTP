# CLAUDE.md — Personal Finance Tracker

## What This Project Is

A personal finance tracker built for daily use. The user logs transactions across multiple bank accounts and credit cards, sees live balances, and tracks how much money is left. Every week, transaction data is automatically exported and pushed to a Databricks workspace where an existing data pipeline processes it and populates Delta tables for analytics.

This is not a demo or prototype. Build it production-quality: clean code, proper error handling, typed interfaces, environment-based config, and a UI that feels intentional — not like a template.

---

## What Has Already Been Decided — Do Not Re-Litigate

- **Frontend:** Next.js (App Router)
- **Backend:** FastAPI (Python)
- **Database:** Supabase (Postgres)
- **Automation:** External cron via cron-job.org (free) — hits POST /api/sync/trigger every Sunday. No APScheduler inside FastAPI — removed due to free tier sleep behaviour on Render
- **Databricks sync:** CSV uploaded directly to a Unity Catalog Volume via the Databricks Files API
- **No job trigger API call** — the Databricks job is configured to trigger automatically when the file lands in the Volume
- **No cloud storage accounts** (S3/ADLS/GCS) — upload goes directly to the Volume
- **Databricks is the free edition** — not Community Edition — REST API is available
- **No per-transaction Databricks calls** — weekly batch only
- **Volume path:** `/Volumes/expense_tracker/landing/data/weekly_transactions.csv`

If any of these decisions seem wrong for a specific technical reason, flag it with a comment. Do not silently change them.

---

## Repository Structure

```
finance-tracker/
├── CLAUDE.md                   ← You are here
├── ARCHITECTURE.md             ← High-level system overview
├── docs/
│   ├── FRONTEND.md             ← Frontend architecture detail
│   ├── BACKEND.md              ← Backend + database architecture detail
│   └── SYNC.md                 ← Databricks sync architecture detail
├── frontend/                   ← Next.js app
├── backend/                    ← FastAPI app
└── docker-compose.yml          ← Local dev orchestration
```

---

## Architecture Files

Before writing any code, read all four architecture documents:

1. `ARCHITECTURE.md` — system overview, data flow, decisions
2. `docs/FRONTEND.md` — pages, components, state, design
3. `docs/BACKEND.md` — API routes, Supabase schema, service layer
4. `docs/SYNC.md` — weekly automation, Volume upload, external cron setup

---

## Environment Variables

### Backend (`backend/.env`)

```
SUPABASE_URL=
SUPABASE_SERVICE_KEY=
DATABRICKS_HOST=           # e.g. https://dbc-4db848ba-6cbe.cloud.databricks.com
DATABRICKS_TOKEN=          # Personal Access Token from User Settings
DATABRICKS_VOLUME_PATH=    # /Volumes/expense_tracker/landing/data/weekly_transactions.csv
```

### Frontend (`frontend/.env.local`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Non-Negotiables

- All money values stored as **integers in cents** — never floats
- All timestamps stored in **UTC**, displayed in user's local time
- API responses always return a consistent envelope: `{ data, error, meta }`
- Never expose `SUPABASE_SERVICE_KEY` to the frontend — backend only
- All Databricks credentials are environment variables — never hardcoded
- Credit card accounts track **amount owed** (liability), not a balance going down
- The weekly sync must be **idempotent** — re-running it for the same week should not duplicate data in the Volume

---

## Code Style

### Python (Backend)

- Python 3.11+
- Type hints everywhere — no bare `dict` or `Any` without a comment
- Pydantic models for all request/response schemas
- Async throughout — use `httpx.AsyncClient` for external calls
- Services are classes, routes are thin — business logic never lives in route handlers
- Errors raise typed exceptions caught by a global exception handler

### TypeScript (Frontend)

- Strict mode on
- No `any` — use proper types or `unknown` with a guard
- Components in `PascalCase`, hooks prefixed `use`, utils in `camelCase`
- Fetch via a typed API client — never raw `fetch` in components
- Currency always formatted via a shared `formatCurrency(cents: number)` utility

---

## The Weekly Sync — Critical Detail

The sync is triggered every Sunday by **cron-job.org** (free external cron service) hitting `POST /api/sync/trigger`. There is no APScheduler inside FastAPI — removed because Render's free tier spins down after inactivity and an internal scheduler would never fire reliably.

The sync endpoint:

1. Queries Supabase for all transactions from the past 7 days
2. Serializes to CSV in memory
3. Uploads the CSV to a Databricks Unity Catalog Volume using the Files API (`PUT /api/2.0/fs/files/Volumes/...`)
4. The Databricks job triggers **automatically** when the file lands — no API call needed
5. Logs the result (success/failure) to a `sync_logs` table in Supabase

The external cron ping also keeps the Render server awake. Two problems solved with one approach.

See `docs/SYNC.md` for full implementation detail.

---

## What the User Cares About

- Seeing their real balances at a glance — this is the primary job of the UI
- Logging a transaction quickly — minimum friction
- Knowing how much money is left (against a monthly budget)
- Credit card spending tracked separately — it is debt, not a debit balance
- The Databricks sync should just work silently in the background

---

## Running Locally

```bash
# Start everything
docker-compose up

# Backend only
cd backend && uvicorn main:app --reload

# Frontend only
cd frontend && npm run dev
```

Backend runs on `http://localhost:8000`
Frontend runs on `http://localhost:3000`
Supabase: use the hosted free tier — no local emulator needed
