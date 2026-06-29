# ARCHITECTURE.md — System Overview

## What This System Does

A personal finance tracker with two distinct responsibilities:

1. **Live tracking** — log transactions, maintain account balances, show spending vs budget in real time. Powered by Next.js + FastAPI + Supabase.

2. **Weekly analytics sync** — every Sunday, export the week's transactions as CSV, upload to Databricks File System (DBFS), and trigger an existing Databricks pipeline that populates Delta tables for analytics dashboards.

These two responsibilities are intentionally decoupled. The live tracker does not depend on Databricks being up. Databricks does not depend on the tracker's internal structure. The sync is a one-way, write-only push.

---

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER'S BROWSER                          │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐   │
│   │                  Next.js Frontend                       │   │
│   │                                                         │   │
│   │  Dashboard  │  Accounts  │  Transactions  │  Budget     │   │
│   └──────────────────────────┬──────────────────────────────┘   │
│                              │ REST API calls                   │
└──────────────────────────────┼──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                       FastAPI Backend                           │
│                                                                 │
│  ┌────────────────┐  ┌─────────────────┐  ┌────────────────┐   │
│  │  Account       │  │  Transaction    │  │  Budget        │   │
│  │  Service       │  │  Service        │  │  Service       │   │
│  └────────────────┘  └─────────────────┘  └────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Sync Scheduler (APScheduler)            │   │
│  │                  Runs every Sunday 00:00 UTC             │   │
│  └──────────────────────────────┬───────────────────────────┘   │
│                                 │                               │
└─────────────────────────────────┼───────────────────────────────┘
           │                      │
           ▼                      ▼
┌──────────────────┐   ┌──────────────────────────────────────────┐
│    Supabase      │   │              Databricks                  │
│    (Postgres)    │   │                                          │
│                  │   │  1. DBFS receives weekly CSV             │
│  accounts        │   │  2. Job triggered via REST API           │
│  transactions    │   │  3. Existing pipeline runs               │
│  budgets         │   │  4. Delta tables populated               │
│  sync_logs       │   │  5. Your existing dashboards update      │
│                  │   │                                          │
└──────────────────┘   └──────────────────────────────────────────┘
```

---

## Data Flow

### Transaction Logging (Real-time)

```
User fills form
    → POST /api/transactions
    → FastAPI validates, computes new balance
    → Writes transaction to Supabase transactions table
    → Updates account balance in Supabase accounts table
    → Returns updated account state
    → Frontend updates UI instantly
```

### Weekly Databricks Sync (Automated)

```
APScheduler fires Sunday 00:00 UTC
    → Query Supabase: all transactions from last 7 days
    → Serialize to CSV (UTF-8, standard headers)
    → POST to Databricks DBFS PUT API → file lands at configured DBFS path
    → POST to Databricks Jobs run-now API → existing pipeline triggered
    → Write result to sync_logs table (success/failure, timestamp, row count)
```

### Balance Calculation

```
Account balance is maintained as a running total in the accounts table.
Each transaction write atomically updates the balance.
No balance is computed on-the-fly from transaction history —
the accounts.balance column is always the source of truth.
Credit card accounts store amount_owed (always >= 0).
```

---

## Key Decisions and Why

| Decision                              | Rationale                                                                                                                 |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| FastAPI over Node backend             | Python keeps the data/analytics stack consistent. Databricks SDK and CSV handling are first-class in Python.              |
| Supabase over raw Postgres            | Managed Postgres with built-in auth, row-level security, and a real-time API. Removes infra overhead.                     |
| APScheduler inside FastAPI            | Avoids a separate scheduler service (Celery, Airflow) for a single weekly job. Simple and sufficient.                     |
| DBFS direct upload over cloud storage | User is on Databricks free edition — no S3/ADLS/GCS. DBFS REST API is available on all tiers.                             |
| No per-transaction Databricks call    | Reduces coupling, avoids latency in the hot path, and respects API rate limits. Weekly batch is sufficient for analytics. |
| Cents as integers                     | Eliminates floating-point rounding errors in financial calculations.                                                      |
| Credit cards as separate account type | Credit cards are liabilities, not assets. Tracking them separately prevents balance confusion.                            |

---

## Failure Modes and Handling

| Scenario                         | Behaviour                                                                                                         |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Databricks API is down on Sunday | Sync job logs failure to `sync_logs`, retries once after 1 hour. Alert logged. No impact on live tracker.         |
| Supabase is unreachable          | FastAPI returns 503. Frontend shows a connection error banner. No silent failures.                                |
| Duplicate sync run for same week | Sync is idempotent — DBFS PUT with `overwrite: true`. Same file path = safe to re-run.                            |
| Transaction write fails mid-way  | Balance update and transaction insert are wrapped in a Supabase transaction. Either both succeed or neither does. |

---

## Security Considerations

- `SUPABASE_SERVICE_KEY` lives only in the backend — never sent to the browser
- Frontend uses `SUPABASE_ANON_KEY` with Row Level Security enabled
- Databricks Personal Access Token stored as environment variable — never in code
- All API routes behind authentication (Supabase Auth JWT validated by FastAPI)
- CORS locked to frontend origin only

---

## Scalability Notes

This is a personal finance tracker — single user. Performance at scale is not a concern. However:

- The schema is clean enough to support multiple users if Row Level Security is configured per user
- The sync architecture supports adding more export targets without changing the scheduler
- The service layer in FastAPI is structured to allow swapping Supabase for another Postgres host

---

## Document Map

| File               | What it covers                                               |
| ------------------ | ------------------------------------------------------------ |
| `CLAUDE.md`        | Project intent, stack decisions, code style, non-negotiables |
| `ARCHITECTURE.md`  | This file — system overview, data flow, key decisions        |
| `docs/FRONTEND.md` | Pages, components, state management, design system           |
| `docs/BACKEND.md`  | API routes, service layer, Supabase schema, auth             |
| `docs/SYNC.md`     | Weekly scheduler, DBFS upload, job trigger, retry logic      |
