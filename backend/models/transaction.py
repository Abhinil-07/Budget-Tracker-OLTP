from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from uuid import UUID

class Transaction(BaseModel):
    id: UUID
    user_id: UUID
    account_id: UUID
    type: str  # 'income', 'expense'
    amount_cents: int
    category: str
    description: Optional[str] = None
    txn_date: date
    status: Optional[str] = "confirmed"  # 'confirmed' vs 'staged'
    created_at: datetime

    class Config:
        from_attributes = True

class CreateTransactionDto(BaseModel):
    account_id: UUID
    type: str = Field(..., pattern="^(income|expense)$")
    amount_cents: int = Field(..., gt=0)
    category: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    txn_date: Optional[date] = None
    status: Optional[str] = Field(default="confirmed", pattern="^(confirmed|staged)$")

class UpdateTransactionDto(BaseModel):
    account_id: Optional[UUID] = None
    type: Optional[str] = Field(default=None, pattern="^(income|expense)$")
    amount_cents: Optional[int] = Field(default=None, gt=0)
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    txn_date: Optional[date] = None
    status: Optional[str] = Field(default=None, pattern="^(confirmed|staged)$")

class TransactionQuery(BaseModel):
    account_id: Optional[UUID] = None
    category: Optional[str] = None
    type: Optional[str] = Field(default=None, pattern="^(income|expense)$")
    status: Optional[str] = Field(default="confirmed")
    date_from: Optional[date] = None
    date_to: Optional[date] = None
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=10000)

class PaginatedTransactions(BaseModel):
    items: List[Transaction]
    total: int
    page: int
    page_size: int

class DeleteTransactionResponse(BaseModel):
    success: bool = True
    message: str = "Transaction successfully deleted"
    id: UUID

class BatchCreateTransactionsDto(BaseModel):
    items: List[CreateTransactionDto] = Field(..., min_length=1, max_length=1000)

class BatchCreateResponse(BaseModel):
    imported_count: int
    account_ids: List[UUID]

class ParseTextDto(BaseModel):
    text: str = Field(..., min_length=1, description="Raw SMS or Email notification text")
    account_id: Optional[UUID] = None
    auto_stage: bool = Field(default=True, description="Automatically save to Staged Inbox if account is provided")

class ParsedTransactionResponse(BaseModel):
    amount_cents: int
    type: str
    category: str
    description: str
    txn_date: date
    staged_id: Optional[UUID] = None

