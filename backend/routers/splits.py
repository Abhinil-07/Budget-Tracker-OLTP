from fastapi import APIRouter, Depends, status
from supabase import AsyncClient
from supabase_auth import User
from typing import List
from datetime import date

from db.supabase import get_supabase
from dependencies import get_current_user
from models.split import PersonBalance, Person, Settlement, CreateSettlementDto
from models.envelope import ApiResponse
from exceptions import NotFoundError, ValidationError

router = APIRouter(prefix="/splits", tags=["splits"])

@router.get("/balances", response_model=ApiResponse[List[PersonBalance]])
async def get_person_balances(
    current_user: User = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_supabase),
):
    """Fetch net balances for each person (who owes whom, net of settlements)."""
    try:
        res = await supabase.from_("v_person_balances").select("*").eq("user_id", str(current_user.id)).execute()
        items = [PersonBalance(**row) for row in (res.data or [])]
        return ApiResponse(data=items)
    except Exception as e:
        print("Error fetching v_person_balances:", e)
        return ApiResponse(data=[])

@router.get("/people", response_model=ApiResponse[List[Person]])
async def list_people(
    current_user: User = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_supabase),
):
    """List known people for the current user."""
    res = await supabase.from_("people").select("*").eq("user_id", str(current_user.id)).order("name").execute()
    items = [Person(**row) for row in (res.data or [])]
    return ApiResponse(data=items)

@router.post("/settle", response_model=ApiResponse[Settlement], status_code=status.HTTP_201_CREATED)
async def create_settlement(
    dto: CreateSettlementDto,
    current_user: User = Depends(get_current_user),
    supabase: AsyncClient = Depends(get_supabase),
):
    """Record a repayment between two people."""
    insert_data = {
        "user_id": str(current_user.id),
        "from_person": str(dto.from_person),
        "to_person": str(dto.to_person),
        "amount_paise": dto.amount_paise,
        "date": (dto.date or date.today()).isoformat(),
        "note": dto.note,
    }

    res = await supabase.from_("settlements").insert(insert_data).execute()
    if not res.data:
        raise ValidationError("Failed to record settlement")

    return ApiResponse(data=Settlement(**res.data[0]))
