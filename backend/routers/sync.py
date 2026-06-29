from fastapi import APIRouter, Depends, BackgroundTasks
from datetime import datetime, timezone, timedelta
from supabase import AsyncClient
from supabase_auth import User

from db.supabase import get_supabase
from dependencies import get_current_user
from services.sync_service import SyncService
from exceptions import SyncRateLimitError
from models.envelope import ApiResponse

router = APIRouter(prefix="/sync", tags=["sync"])

def get_sync_service(supabase: AsyncClient = Depends(get_supabase)) -> SyncService:
    return SyncService(supabase)

@router.get("/status")
async def get_sync_status(
    current_user: User = Depends(get_current_user),
    service: SyncService = Depends(get_sync_service)
):
    """Returns the most recent sync log entry."""
    status = await service.get_last_sync_status(str(current_user.id))
    return ApiResponse(data=status)

@router.post("/trigger")
async def trigger_sync(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    service: SyncService = Depends(get_sync_service)
):
    """
    Called by cron-job.org every Sunday and manually from settings.
    Rate limited to once per 6 hours to prevent duplicate runs.
    Runs in background — HTTP response returns immediately.
    """
    user_id = str(current_user.id)
    last = await service.get_last_sync_status(user_id)
    if last:
        last_time = datetime.fromisoformat(last["triggered_at"])
        if datetime.now(timezone.utc) - last_time < timedelta(hours=6):
            raise SyncRateLimitError("Sync ran recently. Try again later.")

    # Synchronously create log entry to lock the rate limit instantly
    log_id = await service.create_sync_log(user_id, "scheduled")

    background_tasks.add_task(service.execute_sync_pipeline, log_id, user_id)
    return ApiResponse(data={"message": "Sync started in background"})
