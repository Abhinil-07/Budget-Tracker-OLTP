from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from supabase import AsyncClient
from db.supabase import get_supabase

router = APIRouter(prefix="/auth", tags=["auth"])

class AuthCredentials(BaseModel):
    email: str
    password: str

@router.post("/login")
async def login(credentials: AuthCredentials, supabase: AsyncClient = Depends(get_supabase)):
    """Authenticate credentials via Supabase and return session access tokens."""
    try:
        response = await supabase.auth.sign_in_with_password({
            "email": credentials.email,
            "password": credentials.password
        })
        
        if not response or not response.session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication failed. Invalid email or password."
            )
            
        return {
            "data": {
                "access_token": response.session.access_token,
                "user": {
                    "id": response.user.id,
                    "email": response.user.email
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

@router.post("/signup")
async def signup(credentials: AuthCredentials, supabase: AsyncClient = Depends(get_supabase)):
    """Register a new user email and password profile in the database."""
    try:
        response = await supabase.auth.sign_up({
            "email": credentials.email,
            "password": credentials.password
        })
        
        if not response or not response.user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Sign up failed. Please try a different email or password."
            )
            
        return {
            "data": {
                "user": {
                    "id": response.user.id,
                    "email": response.user.email
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
