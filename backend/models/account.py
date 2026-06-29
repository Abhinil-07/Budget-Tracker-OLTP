from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class Account(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    type: str  # 'savings', 'current', 'credit_card'
    balance_cents: int
    currency: str
    account_number: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class CreateAccountDto(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., pattern="^(savings|current|credit_card)$")
    opening_balance: int = Field(default=0)  # Input is in cents
    currency: str = Field(default="INR", min_length=3, max_length=3)
    account_number: Optional[str] = Field(default=None, max_length=50)

class UpdateAccountDto(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    currency: Optional[str] = Field(default=None, min_length=3, max_length=3)
    account_number: Optional[str] = Field(default=None, max_length=50)
    balance_cents: Optional[int] = Field(default=None)

class AccountResponse(Account):
    class Config:
        from_attributes = True

class DeleteResponse(BaseModel):
    success: bool = True
    message: str = "Account successfully deleted"
    id: UUID
