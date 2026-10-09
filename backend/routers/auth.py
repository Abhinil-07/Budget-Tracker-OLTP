from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import AsyncClient
from supabase_auth import User
from datetime import datetime, timezone
import re
from db.supabase import get_supabase
from dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

class AuthCredentials(BaseModel):
    email: str
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class SendOtpRequest(BaseModel):
    identifier: str  # Can be an email or a registered mobile number

class VerifyOtpRequest(BaseModel):
    email: str
    token: str

class UpdatePhoneRequest(BaseModel):
    phone: str

def normalize_phone(phone: str) -> str:
    """Normalize phone number to numeric digits."""
    return re.sub(r"\D", "", phone or "")

def mask_email(email: str) -> str:
    """Mask email for privacy, e.g. subhpal200@gmail.com -> s*******0@gmail.com"""
    if "@" not in email:
        return email
    name, domain = email.split("@", 1)
    if len(name) <= 2:
        masked_name = name[0] + "*"
    else:
        masked_name = name[0] + "*" * (len(name) - 2) + name[-1]
    return f"{masked_name}@{domain}"

async def find_user_by_phone(supabase: AsyncClient, phone: str) -> tuple[str | None, str | None]:
    """Search for a user by their phone number from user_profiles table or user_metadata."""
    norm = normalize_phone(phone)
    if not norm:
        return None, None
    last_10 = norm[-10:] if len(norm) >= 10 else norm

    # 1. Check user_profiles table if it exists
    try:
        res = await supabase.table("user_profiles").select("user_id, phone").execute()
        if res.data:
            for row in res.data:
                row_norm = normalize_phone(row.get("phone") or "")
                if row_norm and (row_norm[-10:] == last_10 or row_norm == norm):
                    uid = row.get("user_id")
                    user_resp = await supabase.auth.admin.get_user_by_id(uid)
                    if user_resp and user_resp.user:
                        return user_resp.user.id, user_resp.user.email
    except Exception:
        # Table might not exist yet
        pass

    # 2. Check auth.admin users list (user_metadata or phone attribute)
    try:
        users = await supabase.auth.admin.list_users()
        for u in users:
            u_phone = u.phone or (u.user_metadata or {}).get("phone") or ""
            u_norm = normalize_phone(u_phone)
            if u_norm and (u_norm[-10:] == last_10 or u_norm == norm):
                return u.id, u.email
    except Exception as e:
        print(f"Error searching users by phone: {e}")

    return None, None

async def resolve_user_phone(supabase: AsyncClient, user_id: str, default_phone: str | None = None) -> str | None:
    """Resolve phone from auth attributes or user_profiles table."""
    if default_phone:
        return default_phone
    try:
        res = await supabase.table("user_profiles").select("phone").eq("user_id", user_id).limit(1).execute()
        if res.data and res.data[0].get("phone"):
            return res.data[0].get("phone")
    except Exception:
        pass
    return None

@router.post("/login")
async def login(credentials: AuthCredentials, supabase: AsyncClient = Depends(get_supabase)):
    """Authenticate credentials via Supabase and return session access tokens and user profile."""
    try:
        response = await supabase.auth.sign_in_with_password({
            "email": credentials.email.strip(),
            "password": credentials.password
        })
        
        if not response or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed. Invalid email or password."
            )

        raw_phone = response.user.phone or (response.user.user_metadata or {}).get("phone")
        phone = await resolve_user_phone(supabase, response.user.id, raw_phone)
            
        return {
            "data": {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_at": response.session.expires_at,
                "expires_in": response.session.expires_in,
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "phone": phone
                }
            },
            "error": None,
            "meta": {}
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

@router.post("/refresh")
async def refresh_session(payload: RefreshRequest, supabase: AsyncClient = Depends(get_supabase)):
    """Refresh user session using Supabase refresh token."""
    if not payload.refresh_token or not payload.refresh_token.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Refresh token is required."
        )
    try:
        response = await supabase.auth.refresh_session(payload.refresh_token.strip())
        if not response or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired session. Please log in again."
            )

        raw_phone = response.user.phone or (response.user.user_metadata or {}).get("phone")
        phone = await resolve_user_phone(supabase, response.user.id, raw_phone)

        return {
            "data": {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_at": response.session.expires_at,
                "expires_in": response.session.expires_in,
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "phone": phone
                }
            },
            "error": None,
            "meta": {}
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Session refresh failed: {str(e)}"
        )

@router.post("/signup")
async def signup(credentials: AuthCredentials, supabase: AsyncClient = Depends(get_supabase)):
    """Register a new user email and password profile in the database."""
    try:
        response = await supabase.auth.sign_up({
            "email": credentials.email.strip(),
            "password": credentials.password
        })
        
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sign up failed. Please try a different email or password."
            )

        session_data = {}
        if response.session:
            session_data = {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_at": response.session.expires_at,
                "expires_in": response.session.expires_in,
            }
            
        return {
            "data": {
                **session_data,
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "phone": None
                }
            },
            "error": None,
            "meta": {}
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )

@router.post("/otp/send")
async def send_otp(payload: SendOtpRequest, supabase: AsyncClient = Depends(get_supabase)):
    """Send a 6-digit OTP code to the user's email or registered mobile number."""
    identifier = payload.identifier.strip()
    if not identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address or mobile number is required."
        )

    target_email: str | None = None
    via_phone = False

    if "@" in identifier:
        target_email = identifier
    else:
        # User entered a mobile number -> lookup linked email
        via_phone = True
        uid, found_email = await find_user_by_phone(supabase, identifier)
        if not found_email:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No account found associated with mobile number {identifier}. Please sign in with your email first to link your phone."
            )
        target_email = found_email

    try:
        await supabase.auth.sign_in_with_otp({"email": target_email})
        return {
            "data": {
                "email": target_email,
                "masked_email": mask_email(target_email),
                "via_phone": via_phone,
                "message": "6-digit verification code has been dispatched."
            },
            "error": None,
            "meta": {}
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to send OTP code: {str(e)}"
        )

@router.post("/otp/verify")
async def verify_otp(payload: VerifyOtpRequest, supabase: AsyncClient = Depends(get_supabase)):
    """Verify the 6-digit OTP code and return full session tokens."""
    email = payload.email.strip()
    token = payload.token.strip()

    if not email or not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address and 6-digit OTP code are required."
        )

    try:
        response = await supabase.auth.verify_otp({
            "email": email,
            "token": token,
            "type": "email"
        })

        if not response or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Verification failed. Invalid or expired OTP code."
            )

        raw_phone = response.user.phone or (response.user.user_metadata or {}).get("phone")
        phone = await resolve_user_phone(supabase, response.user.id, raw_phone)

        return {
            "data": {
                "access_token": response.session.access_token,
                "refresh_token": response.session.refresh_token,
                "expires_at": response.session.expires_at,
                "expires_in": response.session.expires_in,
                "user": {
                    "id": response.user.id,
                    "email": response.user.email,
                    "phone": phone
                }
            },
            "error": None,
            "meta": {}
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"OTP verification failed: {str(e)}"
        )

@router.get("/profile")
async def get_profile(
    current_user: User = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_supabase)
):
    """Retrieve current user profile including mobile number."""
    raw_phone = current_user.phone or (current_user.user_metadata or {}).get("phone")
    phone = await resolve_user_phone(supabase, current_user.id, raw_phone)

    return {
        "data": {
            "id": current_user.id,
            "email": current_user.email,
            "phone": phone
        },
        "error": None,
        "meta": {}
    }

@router.put("/profile/phone")
async def update_phone(
    payload: UpdatePhoneRequest,
    current_user: User = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_supabase)
):
    """Link or update the mobile number for the current user."""
    clean = normalize_phone(payload.phone)
    if len(clean) < 10:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a valid mobile number with at least 10 digits."
        )

    # Format cleanly (e.g. keep user's entered format or clean string)
    formatted_phone = payload.phone.strip()

    # 1. Update in Supabase Auth user_metadata
    try:
        user_meta = dict(current_user.user_metadata or {})
        user_meta["phone"] = formatted_phone
        await supabase.auth.admin.update_user_by_id(
            current_user.id,
            {"user_metadata": user_meta}
        )
    except Exception as e:
        print(f"Warning: Failed to update user_metadata in auth.admin: {e}")

    # 2. Upsert into user_profiles table if it exists
    try:
        await supabase.table("user_profiles").upsert({
            "user_id": current_user.id,
            "phone": formatted_phone,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).execute()
    except Exception as e:
        print(f"Notice: user_profiles table not found or error upserting: {e}")

    return {
        "data": {
            "phone": formatted_phone,
            "message": "Mobile number linked successfully."
        },
        "error": None,
        "meta": {}
    }
