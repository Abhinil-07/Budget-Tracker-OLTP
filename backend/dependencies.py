import time
import jwt
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import AsyncClient
from supabase_auth import User
from datetime import datetime, timezone
from db.supabase import get_supabase
from config import settings

security = HTTPBearer(auto_error=False)

# In-memory cache for validated Supabase tokens: token -> (User, expire_timestamp)
_USER_CACHE: dict[str, tuple[User, float]] = {}

def _clean_cache():
    global _USER_CACHE
    now = time.time()
    if len(_USER_CACHE) > 500:
        _USER_CACHE = {k: v for k, v in _USER_CACHE.items() if v[1] > now}

async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    supabase: AsyncClient = Depends(get_supabase)
) -> User:
    global _USER_CACHE

    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header"
        )
    
    token = credentials.credentials
    if isinstance(token, bytes):
        token = token.decode("utf-8")
    token = token.strip()
    
    now = time.time()

    # 1. Fast path: check in-memory TTL cache
    cached = _USER_CACHE.get(token)
    if cached:
        cached_user, cache_expiry = cached
        if now < cache_expiry:
            return cached_user
        else:
            _USER_CACHE.pop(token, None)

    # 2. Inspect JWT claims
    claims: dict = {}
    try:
        claims = jwt.decode(token, options={"verify_signature": False})
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed authorization token"
        )

    # Check expiration claim if present
    exp = claims.get("exp")
    if exp is not None and float(exp) < now:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired"
        )

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token claims: missing subject"
        )

    # 3. Standard Supabase JWT validation with fallback
    try:
        response = await supabase.auth.get_user(token)
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User session not found or expired"
            )
        user = response.user
        
        # Cache for up to 120 seconds or until token expiration
        remaining = (float(exp) - now) if exp else 120.0
        ttl = max(10.0, min(120.0, remaining))
        _USER_CACHE[token] = (user, now + ttl)
        _clean_cache()
        return user

    except HTTPException:
        raise
    except Exception as e:
        err_msg = str(e).lower()
        if "expired" in err_msg or "invalid" in err_msg or "not found" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid or expired token: {str(e)}"
            )

        # In case of transient network timeout / rate-limit from Supabase,
        # but the JWT itself is unexpired and has valid claims:
        if exp is not None and float(exp) > now + 15:
            user = User(
                id=str(user_id),
                email=claims.get("email", ""),
                aud=claims.get("aud", "authenticated"),
                role=claims.get("role", "authenticated"),
                app_metadata=claims.get("app_metadata", {}),
                user_metadata=claims.get("user_metadata", {}),
                created_at=datetime.now(timezone.utc).isoformat(),
            )
            _USER_CACHE[token] = (user, now + 30.0)
            return user

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authorization service error: {str(e)}"
        )
