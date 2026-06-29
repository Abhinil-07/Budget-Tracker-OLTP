from supabase import create_async_client, AsyncClient
from config import settings

_client: AsyncClient | None = None

async def get_supabase() -> AsyncClient:
    global _client
    if _client is None:
        if not settings.supabase_url or not settings.supabase_service_key:
            raise RuntimeError(
                "Supabase credentials are not configured. "
                "Ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in backend/.env"
            )
        _client = await create_async_client(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_service_key
        )
    return _client
