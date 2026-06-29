from fastapi import APIRouter, Depends, status
from typing import List
from supabase import AsyncClient
from supabase_auth import User

from db.supabase import get_supabase
from dependencies import get_current_user
from services.account_service import AccountService
from models.account import AccountResponse, CreateAccountDto, UpdateAccountDto, DeleteResponse
from models.envelope import ApiResponse

router = APIRouter(prefix="/accounts", tags=["accounts"])

def get_account_service(supabase: AsyncClient = Depends(get_supabase)) -> AccountService:
    return AccountService(supabase)

@router.get("", response_model=ApiResponse[List[AccountResponse]])
async def list_accounts(
    current_user: User = Depends(get_current_user),
    service: AccountService = Depends(get_account_service)
):
    accounts = await service.list_accounts(str(current_user.id))
    return ApiResponse(data=accounts)

@router.post("", response_model=ApiResponse[AccountResponse], status_code=status.HTTP_201_CREATED)
async def create_account(
    dto: CreateAccountDto,
    current_user: User = Depends(get_current_user),
    service: AccountService = Depends(get_account_service)
):
    account = await service.create_account(dto, str(current_user.id))
    return ApiResponse(data=account)

@router.patch("/{account_id}", response_model=ApiResponse[AccountResponse])
async def update_account(
    account_id: str,
    dto: UpdateAccountDto,
    current_user: User = Depends(get_current_user),
    service: AccountService = Depends(get_account_service)
):
    account = await service.update_account(account_id, dto, str(current_user.id))
    return ApiResponse(data=account)

@router.delete("/{account_id}", response_model=ApiResponse[DeleteResponse])
async def delete_account(
    account_id: str,
    current_user: User = Depends(get_current_user),
    service: AccountService = Depends(get_account_service)
):
    await service.delete_account(account_id, str(current_user.id))
    return ApiResponse(data=DeleteResponse(id=account_id))
