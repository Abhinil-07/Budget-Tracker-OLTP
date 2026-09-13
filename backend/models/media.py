from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from uuid import UUID

class MediaItem(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    media_type: str
    status: str
    rating: Optional[int] = None
    notes: Optional[str] = None
    url: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class CreateMediaItemDto(BaseModel):
    title: str = Field(..., max_length=255)
    media_type: str = Field(..., pattern="^(book|show|movie|article)$")
    status: str = Field(default="want_to", pattern="^(want_to|in_progress|done)$")
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None
    url: Optional[str] = None

class UpdateMediaItemDto(BaseModel):
    title: Optional[str] = Field(default=None, max_length=255)
    media_type: Optional[str] = Field(default=None, pattern="^(book|show|movie|article)$")
    status: Optional[str] = Field(default=None, pattern="^(want_to|in_progress|done)$")
    rating: Optional[int] = Field(default=None, ge=1, le=5)
    notes: Optional[str] = None
    url: Optional[str] = None

class MediaItemResponse(MediaItem):
    class Config:
        from_attributes = True

class DeleteResponse(BaseModel):
    success: bool = True
    message: str = "Media item successfully deleted"
    id: UUID
