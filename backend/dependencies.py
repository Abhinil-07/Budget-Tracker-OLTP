from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import AsyncClient
from supabase_auth import User
from datetime import datetime, timezone
from db.supabase import get_supabase
from config import settings

security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    supabase: AsyncClient = Depends(get_supabase)
) -> User:
    print(f"DEBUG: get_current_user credentials: {credentials} (type: {type(credentials)})")
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = credentials.credentials
    print(f"DEBUG: get_current_user token: {token[:15]}... (type: {type(token)})")
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    token = token.strip()
    
    # 1. Developer bypass key deactivated for production-ready strict Supabase validation
    # if settings.static_api_key and token == settings.static_api_key:
    #     if not settings.static_user_id:
    #         raise HTTPException(
    #             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    #             detail="static_user_id must be configured when static_api_key is used"
    #         )
    #     return User(
    #         id=settings.static_user_id,
    #         email="local@dev.com",
    #         aud="authenticated",
    #         role="authenticated",
    #         app_metadata={},
    #         user_metadata={},
    #         created_at=datetime.now(timezone.utc).isoformat(),
    #     )
    
    # 2. Standard Supabase JWT validation
    try:
        response = await supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User session not found or expired"
            )
        return response.user
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {str(e)}"
        )
