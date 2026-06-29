from fastapi import APIRouter, Depends, status
from supabase import AsyncClient
from supabase_auth import User

from db.supabase import get_supabase
from dependencies import get_current_user
from services.budget_service import BudgetService
from models.budget import Budget, UpdateBudgetDto, BudgetWithSpend
from models.envelope import ApiResponse

router = APIRouter(prefix="/budget", tags=["budget"])

def get_budget_service(supabase: AsyncClient = Depends(get_supabase)) -> BudgetService:
    return BudgetService(supabase)

from typing import Optional

@router.get("", response_model=ApiResponse[BudgetWithSpend])
async def get_budget(
    month: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    service: BudgetService = Depends(get_budget_service)
):
    result = await service.get_budget(str(current_user.id), month)
    return ApiResponse(data=result)

@router.put("", response_model=ApiResponse[Budget])
async def update_budget(
    dto: UpdateBudgetDto,
    month: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    service: BudgetService = Depends(get_budget_service)
):
    result = await service.upsert_budget(dto, str(current_user.id), month)
    return ApiResponse(data=result)
