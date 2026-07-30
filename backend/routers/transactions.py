from fastapi import APIRouter, Depends, status
from supabase import AsyncClient
from supabase_auth import User

from db.supabase import get_supabase
from dependencies import get_current_user
from services.transaction_service import TransactionService
from models.transaction import (
    Transaction,
    CreateTransactionDto,
    TransactionQuery,
    PaginatedTransactions,
    DeleteTransactionResponse,
    UpdateTransactionDto,
    BatchCreateTransactionsDto,
    BatchCreateResponse,
    ParseTextDto,
    ParsedTransactionResponse,
)
from models.envelope import ApiResponse

router = APIRouter(prefix="/transactions", tags=["transactions"])

def get_transaction_service(supabase: AsyncClient = Depends(get_supabase)) -> TransactionService:
    return TransactionService(supabase)

@router.get("", response_model=ApiResponse[PaginatedTransactions])
async def list_transactions(
    query: TransactionQuery = Depends(),
    current_user: User = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service)
):
    results = await service.list_transactions(query, str(current_user.id))
    return ApiResponse(data=results)

@router.post("", response_model=ApiResponse[Transaction], status_code=status.HTTP_201_CREATED)
async def create_transaction(
    dto: CreateTransactionDto,
    current_user: User = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service)
):
    transaction = await service.create_transaction(dto, str(current_user.id))
    return ApiResponse(data=transaction)

@router.post("/batch", response_model=ApiResponse[BatchCreateResponse], status_code=status.HTTP_201_CREATED)
async def batch_create_transactions(
    payload: BatchCreateTransactionsDto,
    current_user: User = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service)
):
    result = await service.batch_create_transactions(payload.items, str(current_user.id))
    return ApiResponse(data=BatchCreateResponse(**result))

@router.post("/parse-text", response_model=ApiResponse[ParsedTransactionResponse])
async def parse_transaction_text(
    payload: ParseTextDto,
    service: TransactionService = Depends(get_transaction_service)
):
    parsed = service.parse_text(payload.text)
    return ApiResponse(data=ParsedTransactionResponse(**parsed))

@router.post("/parse-sms", response_model=ApiResponse[ParsedTransactionResponse])
async def parse_sms_webhook(
    payload: ParseTextDto,
    service: TransactionService = Depends(get_transaction_service)
):
    parsed = service.parse_text(payload.text)
    return ApiResponse(data=ParsedTransactionResponse(**parsed))

@router.post("/parse-email", response_model=ApiResponse[ParsedTransactionResponse])
async def parse_email_webhook(
    payload: ParseTextDto,
    service: TransactionService = Depends(get_transaction_service)
):
    parsed = service.parse_text(payload.text)
    return ApiResponse(data=ParsedTransactionResponse(**parsed))

@router.patch("/{transaction_id}", response_model=ApiResponse[Transaction])
async def update_transaction(
    transaction_id: str,
    dto: UpdateTransactionDto,
    current_user: User = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service)
):
    transaction = await service.update_transaction(transaction_id, dto, str(current_user.id))
    return ApiResponse(data=transaction)

@router.delete("/{transaction_id}", response_model=ApiResponse[DeleteTransactionResponse])
async def delete_transaction(
    transaction_id: str,
    current_user: User = Depends(get_current_user),
    service: TransactionService = Depends(get_transaction_service)
):
    await service.delete_transaction(transaction_id, str(current_user.id))
    return ApiResponse(data=DeleteTransactionResponse(id=transaction_id))
