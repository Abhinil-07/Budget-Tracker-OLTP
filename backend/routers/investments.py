from fastapi import APIRouter, Depends, status
from typing import List
from supabase import AsyncClient
from supabase_auth import User

from db.supabase import get_supabase
from dependencies import get_current_user
from services.investment_service import InvestmentService
from models.investment import (
    Investment as InvestmentResponse,
    CreateInvestmentDto,
    UpdateInvestmentDto,
    UpdateInvestmentValueDto,
    DeleteInvestmentResponse,
)
from models.envelope import ApiResponse

router = APIRouter(prefix="/investments", tags=["investments"])

def get_investment_service(supabase: AsyncClient = Depends(get_supabase)) -> InvestmentService:
    return InvestmentService(supabase)

@router.get("", response_model=ApiResponse[List[InvestmentResponse]])
async def list_investments(
    current_user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    investments = await service.list_investments(str(current_user.id))
    return ApiResponse(data=investments)

@router.post("", response_model=ApiResponse[InvestmentResponse], status_code=status.HTTP_201_CREATED)
async def create_investment(
    dto: CreateInvestmentDto,
    current_user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    investment = await service.create_investment(dto, str(current_user.id))
    return ApiResponse(data=investment)

@router.patch("/{investment_id}", response_model=ApiResponse[InvestmentResponse])
async def update_investment(
    investment_id: str,
    dto: UpdateInvestmentDto,
    current_user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    investment = await service.update_investment(investment_id, dto, str(current_user.id))
    return ApiResponse(data=investment)

@router.put("/{investment_id}/value", response_model=ApiResponse[InvestmentResponse])
async def update_investment_value(
    investment_id: str,
    dto: UpdateInvestmentValueDto,
    current_user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    investment = await service.update_investment_value(investment_id, dto, str(current_user.id))
    return ApiResponse(data=investment)

@router.delete("/{investment_id}", response_model=ApiResponse[DeleteInvestmentResponse])
async def delete_investment(
    investment_id: str,
    current_user: User = Depends(get_current_user),
    service: InvestmentService = Depends(get_investment_service)
):
    deleted_id = await service.delete_investment(investment_id, str(current_user.id))
    return ApiResponse(data=DeleteInvestmentResponse(id=deleted_id))
