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

class UpdateTransactionDto(BaseModel):
    account_id: Optional[UUID] = None
    type: Optional[str] = Field(default=None, pattern="^(income|expense)$")
    amount_cents: Optional[int] = Field(default=None, gt=0)
    category: Optional[str] = Field(default=None, min_length=1, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    txn_date: Optional[date] = None

class TransactionQuery(BaseModel):
    account_id: Optional[UUID] = None
    category: Optional[str] = None
    type: Optional[str] = Field(default=None, pattern="^(income|expense)$")
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
