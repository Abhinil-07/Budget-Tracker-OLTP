# SYNC.md — Databricks Weekly Sync Architecture

## Overview

The sync is a one-way, automated, weekly batch process triggered every Sunday by an external cron service (cron-job.org — free). It hits the backend's `POST /api/sync/trigger` endpoint which:

1. Queries Supabase for the past 7 days of transactions
2. Serializes them to a UTF-8 CSV file in memory
3. Uploads the CSV to a Databricks Unity Catalog Volume using the Files API
4. Logs the outcome to the `sync_logs` Supabase table

**The Databricks job triggers automatically when the file lands in the Volume — no API call needed.**
**There is no APScheduler inside FastAPI** — removed because Render's free tier spins the server down after inactivity, making an internal scheduler unreliable.

---

## Why External Cron Instead of APScheduler

| Approach                     | Problem on Free Tier                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| APScheduler inside FastAPI   | Render spins down after 15min inactivity. If server is asleep Sunday midnight, scheduler never fires.        |
| External cron (cron-job.org) | Hits the endpoint from outside. Wakes the server up if it was sleeping. Reliable regardless of server state. |

The external cron ping on Sunday also acts as a keep-alive. Two problems solved with one approach.

---

## Sync Flow

```
cron-job.org fires Sunday 00:00 UTC
        │
        ▼
POST /api/sync/trigger (FastAPI)
        │
   Rate limit check (6hr cooldown)
        │
   Runs in background task
        │
   ┌────┴────────────────┐
   │  1. Export CSV       │
   │     from Supabase   │
   └────────────────────┘
        │
   ┌────┴────────────────┐
   │  2. PUT CSV to       │
   │     Databricks       │
   │     Volume           │
   └────────────────────┘
        │
   Databricks job auto-triggers
        │
   ┌────┴────────────────┐
   │  3. Log result to    │
   │     sync_logs        │
   └────────────────────┘
```

---

## Volume Path

```
/Volumes/expense_tracker/landing/data/weekly_transactions.csv
```

Set via `DATABRICKS_VOLUME_PATH` env var. The file is overwritten each week — intentional and idempotent.

---

## SyncService — Full Implementation

No scheduler setup needed. The service is called directly by the route handler.

```python
# services/sync_service.py
import csv
import io
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional

import httpx
from supabase import AsyncClient

from config import settings

logger = logging.getLogger(__name__)


class SyncService:
    def __init__(self, db: AsyncClient):
        self.db = db
        self.databricks_host = settings.databricks_host.rstrip("/")
        self.upload_headers = {
            "Authorization": f"Bearer {settings.databricks_token}",
            "Content-Type": "application/octet-stream",
        }

    # ------------------------------------------------------------------ #
    #  Entry point — called by POST /api/sync/trigger
    # ------------------------------------------------------------------ #

    async def run_weekly_sync(self, trigger_type: str = "external_cron") -> dict:
        """
        Full sync pipeline. Returns a result dict.
        Logs outcome to sync_logs table regardless of success or failure.
        """
        log_id = await self._create_sync_log(trigger_type)

        try:
            # Step 1: Export CSV from Supabase
            csv_content, row_count = await self._export_csv()

            if row_count == 0:
                logger.info("Weekly sync: no transactions this week, skipping upload.")
                await self._update_sync_log(log_id, status="success", rows_exported=0)
                return {"status": "success", "rows_exported": 0, "skipped": True}

            # Step 2: Upload to Databricks Volume
            # Databricks job triggers automatically on file arrival — nothing else needed
            await self._upload_to_volume(csv_content)

            # Step 3: Log success
            await self._update_sync_log(log_id, status="success", rows_exported=row_count)
            logger.info(f"Weekly sync complete: {row_count} rows uploaded to Volume")
            return {"status": "success", "rows_exported": row_count}

        except Exception as e:
            logger.error(f"Weekly sync failed: {e}", exc_info=True)
            await self._update_sync_log(log_id, status="failed", error_message=str(e))
            raise

    # ------------------------------------------------------------------ #
    #  Step 1: Export CSV from Supabase
    # ------------------------------------------------------------------ #

    async def _export_csv(self) -> tuple[str, int]:
        """
        Query last 7 days of transactions from Supabase.
        CSV is built in memory — safe for a personal finance app (KB not GB).
        Returns (csv_string, row_count).
        """
        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).date().isoformat()

        response = (
            await self.db.table("transactions")
            .select(
                "id, account_id, type, amount_cents, category, description, txn_date, created_at"
            )
            .gte("txn_date", week_ago)
            .order("txn_date", desc=False)
            .execute()
        )

        rows = response.data
        if not rows:
            return "", 0

        output = io.StringIO()
        fieldnames = [
            "id",
            "account_id",
            "type",
            "amount_cents",
            "category",
            "description",
            "txn_date",
            "created_at",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

        return output.getvalue(), len(rows)

    # ------------------------------------------------------------------ #
    #  Step 2: Upload to Databricks Unity Catalog Volume
    # ------------------------------------------------------------------ #

    async def _upload_to_volume(self, csv_content: str) -> None:
        """
        Upload CSV to a Databricks Unity Catalog Volume using the Files API.
        PUT /api/2.0/fs/files<volume-path>
        Overwrites existing file — intentional, idempotent.
        Databricks job watches this Volume path and triggers automatically on new file.
        """
        url = f"{self.databricks_host}/api/2.0/fs/files{settings.databricks_volume_path}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.put(
                url,
                headers=self.upload_headers,
                content=csv_content.encode("utf-8"),
            )
            response.raise_for_status()

        logger.info(f"Volume upload successful → {settings.databricks_volume_path}")

    # ------------------------------------------------------------------ #
    #  Sync log helpers
    # ------------------------------------------------------------------ #

    async def _create_sync_log(self, trigger_type: str) -> str:
        result = await self.db.table("sync_logs").insert({
            "trigger_type": trigger_type,
            "status": "in_progress",
        }).execute()
        return result.data[0]["id"]

    async def _update_sync_log(
        self,
        log_id: str,
        status: str,
        rows_exported: Optional[int] = None,
        error_message: Optional[str] = None,
    ) -> None:
        update = {
            "status": status,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        if rows_exported is not None:
            update["rows_exported"] = rows_exported
        if error_message:
            update["error_message"] = error_message[:2000]

        await self.db.table("sync_logs").update(update).eq("id", log_id).execute()

    async def get_last_sync_status(self) -> Optional[dict]:
        result = (
            await self.db.table("sync_logs")
            .select("*")
            .order("triggered_at", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
```

---

## Trigger Endpoint

```python
# routers/sync.py
from fastapi import APIRouter, Depends, BackgroundTasks
from services.sync_service import SyncService
from exceptions import SyncRateLimitError
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.get("/status")
async def get_sync_status(service: SyncService = Depends(get_sync_service)):
    """Returns the most recent sync log entry."""
    status = await service.get_last_sync_status()
    return ApiResponse(data=status)


@router.post("/trigger")
async def trigger_sync(
    background_tasks: BackgroundTasks,
    service: SyncService = Depends(get_sync_service),
):
    """
    Called by cron-job.org every Sunday and by the Settings page manually.
    Rate limited to once per 6 hours to prevent duplicate runs.
    Runs in background — HTTP response returns immediately.
    """
    last = await service.get_last_sync_status()
    if last:
        last_time = datetime.fromisoformat(last["triggered_at"])
        if datetime.now(timezone.utc) - last_time < timedelta(hours=6):
            raise SyncRateLimitError("Sync ran recently. Try again later.")

    background_tasks.add_task(service.run_weekly_sync, trigger_type="external_cron")
    return ApiResponse(data={"message": "Sync started in background"})
```

---

## Config

```python
# config.py — relevant sync fields only
class Settings(BaseSettings):
    supabase_url: str
    supabase_service_key: str
    databricks_host: str
    databricks_token: str
    databricks_volume_path: str = "/Volumes/expense_tracker/landing/data/weekly_transactions.csv"
    sync_rate_limit_hours: int = 6

# No DATABRICKS_JOB_ID — not needed, job is event-driven
# No APScheduler — not needed, cron-job.org handles scheduling
```

---

## CSV Format

Headers must match exactly what your Databricks pipeline expects:

```
id,account_id,type,amount_cents,category,description,txn_date,created_at
```

| Column         | Type          | Notes                                       |
| -------------- | ------------- | ------------------------------------------- |
| `id`           | UUID string   | Transaction UUID from Supabase              |
| `account_id`   | UUID string   | References the account                      |
| `type`         | string        | `income` or `expense`                       |
| `amount_cents` | integer       | Always positive. Divide by 100 for display. |
| `category`     | string        | One of the predefined categories            |
| `description`  | string        | Optional — may be empty                     |
| `txn_date`     | ISO date      | `YYYY-MM-DD`                                |
| `created_at`   | ISO timestamp | UTC                                         |

If your pipeline expects different column names, update `fieldnames` in `_export_csv()`. Do not touch the pipeline.

---

## Setting Up cron-job.org (Do This After Deployment)

1. Go to [cron-job.org](https://cron-job.org) and create a free account
2. Click **Create cronjob**
3. Fill in:
   - **URL:** `https://your-render-backend.onrender.com/api/sync/trigger`
   - **Method:** POST
   - **Headers:** `Authorization: Bearer <your-api-key>` (or however you secure the endpoint)
   - **Schedule:** Custom — every Sunday at 00:00 UTC
   - **Cron expression:** `0 0 * * 0`
4. Save — done

This is also your **keep-alive** strategy. If you want to prevent Render from sleeping, add a second cron job hitting `GET /health` every 10 minutes.

---

## Credentials Required

| Credential                       | Env var                  |
| -------------------------------- | ------------------------ |
| Databricks workspace URL         | `DATABRICKS_HOST`        |
| Databricks Personal Access Token | `DATABRICKS_TOKEN`       |
| Volume path                      | `DATABRICKS_VOLUME_PATH` |

No Job ID. No scheduler config.

---

## Testing Locally

```bash
# Trigger manually
curl -X POST http://localhost:8000/api/sync/trigger \
  -H "Authorization: Bearer <your-jwt>"

# Check result
curl http://localhost:8000/api/sync/status \
  -H "Authorization: Bearer <your-jwt>"

# Verify in Databricks
# Catalog → expense_tracker → landing → data
# weekly_transactions.csv should appear
# Pipeline should have started automatically
```

---

## What to Remove vs Previous Design

| Was in old design                  | Status                                        |
| ---------------------------------- | --------------------------------------------- |
| APScheduler                        | ❌ Removed entirely — no scheduler in FastAPI |
| `scheduler/jobs.py`                | ❌ Do not create this file                    |
| `DATABRICKS_JOB_ID` env var        | ❌ Not needed                                 |
| `_trigger_databricks_job()` method | ❌ Does not exist                             |
| `misfire_grace_time`               | ❌ Not applicable                             |
| cron-job.org external trigger      | ✅ This is the scheduler                      |
| `POST /api/sync/trigger` endpoint  | ✅ This is how sync starts                    |
