from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from decimal import Decimal
from uuid import UUID

class Investment(BaseModel):
    id: UUID
    user_id: UUID
    name: str
    type: str  # 'fixed_deposit', 'stock', 'mutual_fund', 'ppf'
    invested_amount_cents: int
    current_value_cents: int
    interest_rate: Optional[Decimal] = None
    maturity_date: Optional[date] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class CreateInvestmentDto(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    type: str = Field(..., pattern="^(fixed_deposit|stock|mutual_fund|ppf)$")
    invested_amount_cents: int = Field(..., ge=0)
    current_value_cents: int = Field(..., ge=0)
    interest_rate: Optional[Decimal] = Field(default=None, ge=0, le=100)
    maturity_date: Optional[date] = Field(default=None)
    notes: Optional[str] = Field(default=None, max_length=1000)

class UpdateInvestmentDto(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=100)
    invested_amount_cents: Optional[int] = Field(default=None, ge=0)
    current_value_cents: Optional[int] = Field(default=None, ge=0)
    interest_rate: Optional[Decimal] = Field(default=None, ge=0, le=100)
    maturity_date: Optional[date] = Field(default=None)
    notes: Optional[str] = Field(default=None, max_length=1000)

class UpdateInvestmentValueDto(BaseModel):
    invested_amount_cents: int = Field(..., ge=0)
    current_value_cents: int = Field(..., ge=0)

class DeleteInvestmentResponse(BaseModel):
    success: bool = True
    message: str = "Investment successfully deleted"
    id: UUID
