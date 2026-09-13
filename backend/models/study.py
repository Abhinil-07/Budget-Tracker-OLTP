from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime, date
from uuid import UUID

class StudyLog(BaseModel):
    id: UUID
    user_id: UUID
    study_date: date
    topic: Optional[str] = None
    minutes: Optional[int] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class CreateStudyLogDto(BaseModel):
    study_date: date
    topic: Optional[str] = Field(default=None, max_length=255)
    minutes: Optional[int] = Field(default=None, ge=0)
    notes: Optional[str] = None

class UpdateStudyLogDto(BaseModel):
    study_date: Optional[date] = None
    topic: Optional[str] = Field(default=None, max_length=255)
    minutes: Optional[int] = Field(default=None, ge=0)
    notes: Optional[str] = None

class StudyLogResponse(StudyLog):
    class Config:
        from_attributes = True

class StudyGoal(BaseModel):
    id: UUID
    user_id: UUID
    month: date
    goal_text: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

class CreateStudyGoalDto(BaseModel):
    month: date
    goal_text: Optional[str] = None
    status: str = Field(default="not_started", pattern="^(not_started|in_progress|done)$")

class UpdateStudyGoalDto(BaseModel):
    month: Optional[date] = None
    goal_text: Optional[str] = None
    status: Optional[str] = Field(default=None, pattern="^(not_started|in_progress|done)$")

class StudyGoalResponse(StudyGoal):
    class Config:
        from_attributes = True

class DeleteResponse(BaseModel):
    success: bool = True
    message: str = "Successfully deleted"
    id: UUID
