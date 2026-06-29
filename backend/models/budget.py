from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from datetime import datetime, date
from uuid import UUID

class Budget(BaseModel):
    id: UUID
    user_id: UUID
    month: date
    total_cents: int
    category_limits: Optional[Dict[str, int]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class UpdateBudgetDto(BaseModel):
    total_cents: int = Field(..., ge=0)
    category_limits: Optional[Dict[str, int]] = Field(default=None)

class CategorySpend(BaseModel):
    category: str
    limit_cents: int
    spent_cents: int
    remaining_cents: int
    percentage_used: float

class BudgetWithSpend(BaseModel):
    id: Optional[UUID] = None
    month: date
    total_cents: int
    mtd_spent_cents: int
    remaining_cents: int
    percentage_used: float
    category_limits: Optional[Dict[str, int]] = None
    category_breakdown: List[CategorySpend] = Field(default_factory=list)
