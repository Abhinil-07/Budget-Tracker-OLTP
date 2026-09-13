from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from uuid import UUID

class GymSession(BaseModel):
    id: UUID
    user_id: UUID
    session_date: date
    split_type: Optional[str] = None
    exercises: Optional[str] = None
    duration_minutes: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class CreateGymSessionDto(BaseModel):
    session_date: date
    split_type: Optional[str] = Field(default=None, max_length=100)
    exercises: Optional[str] = None
    duration_minutes: Optional[int] = Field(default=None, ge=0)
    notes: Optional[str] = None

class UpdateGymSessionDto(BaseModel):
    session_date: Optional[date] = None
    split_type: Optional[str] = Field(default=None, max_length=100)
    exercises: Optional[str] = None
    duration_minutes: Optional[int] = Field(default=None, ge=0)
    notes: Optional[str] = None

class GymSessionResponse(GymSession):
    class Config:
        from_attributes = True

class DeleteResponse(BaseModel):
    success: bool = True
    message: str = "Session successfully deleted"
    id: UUID
