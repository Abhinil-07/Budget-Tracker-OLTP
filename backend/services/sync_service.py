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

    async def run_weekly_sync(self, user_id: str, trigger_type: str = "scheduled") -> dict:
        """
        Full sync pipeline. Returns a result dict.
        Logs outcome to sync_logs table regardless of success or failure.
        """
        log_id = await self.create_sync_log(user_id, trigger_type)
        return await self.execute_sync_pipeline(log_id, user_id)

    async def execute_sync_pipeline(self, log_id: str, user_id: str) -> dict:
        """Runs the CSV export and upload to Databricks, updating the specified log entry."""
        try:
            # Step 1: Export CSV from Supabase
            csv_content, row_count = await self._export_csv(user_id)

            if row_count == 0:
                logger.info("Weekly sync: no transactions this week, skipping upload.")
                await self._update_sync_log(log_id, status="success", rows_exported=0)
                return {"status": "success", "rows_exported": 0, "skipped": True}

            # Step 2: Upload to Databricks Volume
            await self._upload_to_volume(csv_content)

            # Step 3: Log success
            await self._update_sync_log(log_id, status="success", rows_exported=row_count)
            logger.info(f"Weekly sync complete: {row_count} rows uploaded to Volume")
            return {"status": "success", "rows_exported": row_count}

        except Exception as e:
            logger.error(f"Weekly sync failed: {e}", exc_info=True)
            await self._update_sync_log(log_id, status="failed", error_message=str(e))
            raise

    async def _export_csv(self, user_id: str) -> tuple[str, int]:
        """
        Query last 7 days of transactions from Supabase for this user and format them
        specifically for Databricks. Returns (csv_string, row_count).
        """
        # Get user's name from Supabase auth
        name = "Abhinil"
        try:
            user_info = await self.db.auth.admin.get_user_by_id(user_id)
            if user_info and user_info.user:
                email = user_info.user.email
                metadata = user_info.user.user_metadata or {}
                name = metadata.get("name") or metadata.get("full_name")
                if not name and email:
                    import re
                    raw_name = email.split("@")[0]
                    name = re.sub(r'\d+', '', raw_name).capitalize()
        except Exception as e:
            logger.warning(f"Failed to fetch user name, defaulting to Abhinil: {e}")

        week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).date().isoformat()

        response = (
            await self.db.table("transactions")
            .select(
                "id, account_id, type, amount_cents, category, description, txn_date, created_at, accounts(name)"
            )
            .eq("user_id", user_id)
            .neq("category", "Owed to Me")
            .eq("type", "expense")
            .gte("txn_date", week_ago)
            .order("txn_date", desc=False)
            .execute()
        )

        rows = response.data
        if not rows:
            return "", 0

        mapped_rows = []
        for row in rows:
            # Format Date: YYYY-MM-DD -> DD-MM-YYYY
            try:
                date_obj = datetime.strptime(row["txn_date"], "%Y-%m-%d")
                formatted_date = date_obj.strftime("%d-%m-%Y")
            except Exception:
                formatted_date = row["txn_date"]

            # Format Amount: cents to rupees
            amount_cents = row["amount_cents"]
            amount_spent = int(amount_cents / 100) if amount_cents % 100 == 0 else round(amount_cents / 100, 2)

            # Get Account (Payment Method) name
            payment_method = row.get("accounts", {}).get("name") or "Unknown"

            mapped_rows.append({
                "Name": name,
                "Item": row.get("description") or row.get("category") or "Expense",
                "Amount Spent": amount_spent,
                "Payment Method": payment_method,
                "Date": formatted_date,
                "Category": row.get("category"),
            })

        output = io.StringIO()
        fieldnames = [
            "Name",
            "Item",
            "Amount Spent",
            "Payment Method",
            "Date",
            "Category",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(mapped_rows)

        return output.getvalue(), len(rows)

    async def _upload_to_volume(self, csv_content: str) -> None:
        """
        Upload CSV to a Databricks Unity Catalog Volume using the Files API.
        PUT /api/2.0/fs/files<volume-path> with a dynamic UTC timestamp suffix.
        """
        import os
        base_path = settings.databricks_volume_path
        dir_name, file_name = os.path.split(base_path)
        base_name, ext = os.path.splitext(file_name)
        
        # Format timestamp: e.g., 20260714_152336 (UTC)
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        new_file_name = f"{base_name}_{timestamp}{ext}"
        new_path = os.path.join(dir_name, new_file_name).replace("\\", "/")

        url = f"{self.databricks_host}/api/2.0/fs/files{new_path}"

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.put(
                url,
                headers=self.upload_headers,
                content=csv_content.encode("utf-8"),
            )
            response.raise_for_status()

        logger.info(f"Volume upload successful → {new_path}")

    async def create_sync_log(self, user_id: str, trigger_type: str) -> str:
        """Create initial record in sync_logs."""
        result = await self.db.table("sync_logs").insert({
            "user_id": user_id,
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
        """Update record in sync_logs with final status."""
        update = {
            "status": status,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }
        if rows_exported is not None:
            update["rows_exported"] = rows_exported
        if error_message:
            update["error_message"] = error_message[:2000]

        await self.db.table("sync_logs").update(update).eq("id", log_id).execute()

    async def get_last_sync_status(self, user_id: str) -> Optional[dict]:
        """Fetch the most recent sync_log entry for this user."""
        result = (
            await self.db.table("sync_logs")
            .select("*")
            .eq("user_id", user_id)
            .order("triggered_at", desc=True)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None
