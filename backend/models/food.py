from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from uuid import UUID

class MealLog(BaseModel):
    id: UUID
    user_id: UUID
    meal_date: date
    meal_slot: str
    what_i_ate: Optional[str] = None
    tag: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class CreateMealLogDto(BaseModel):
    meal_date: date
    meal_slot: str = Field(..., pattern="^(breakfast|lunch|dinner|snack)$")
    what_i_ate: Optional[str] = None
    tag: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = None

class UpdateMealLogDto(BaseModel):
    meal_date: Optional[date] = None
    meal_slot: Optional[str] = Field(default=None, pattern="^(breakfast|lunch|dinner|snack)$")
    what_i_ate: Optional[str] = None
    tag: Optional[str] = Field(default=None, max_length=50)
    notes: Optional[str] = None

class MealLogResponse(MealLog):
    class Config:
        from_attributes = True

class DeleteResponse(BaseModel):
    success: bool = True
    message: str = "Meal log successfully deleted"
    id: UUID
