from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional
from supabase import AsyncClient
from supabase_auth import User

from db.supabase import get_supabase
from dependencies import get_current_user
from services.media_service import MediaService
from models.media import MediaItemResponse, CreateMediaItemDto, UpdateMediaItemDto, DeleteResponse
from models.envelope import ApiResponse

router = APIRouter(prefix="/media", tags=["media"])

def get_media_service(supabase: AsyncClient = Depends(get_supabase)) -> MediaService:
    return MediaService(supabase)

@router.get("", response_model=ApiResponse[List[MediaItemResponse]])
async def list_media_items(
    media_type: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    service: MediaService = Depends(get_media_service)
):
    items = await service.list_media_items(str(current_user.id), media_type)
    return ApiResponse(data=items)

@router.post("", response_model=ApiResponse[MediaItemResponse], status_code=status.HTTP_201_CREATED)
async def create_media_item(
    dto: CreateMediaItemDto,
    current_user: User = Depends(get_current_user),
    service: MediaService = Depends(get_media_service)
):
    item = await service.create_media_item(dto, str(current_user.id))
    return ApiResponse(data=item)

@router.patch("/{item_id}", response_model=ApiResponse[MediaItemResponse])
async def update_media_item(
    item_id: str,
    dto: UpdateMediaItemDto,
    current_user: User = Depends(get_current_user),
    service: MediaService = Depends(get_media_service)
):
    item = await service.update_media_item(item_id, dto, str(current_user.id))
    return ApiResponse(data=item)

@router.delete("/{item_id}", response_model=ApiResponse[DeleteResponse])
async def delete_media_item(
    item_id: str,
    current_user: User = Depends(get_current_user),
    service: MediaService = Depends(get_media_service)
):
    await service.delete_media_item(item_id, str(current_user.id))
    return ApiResponse(data=DeleteResponse(id=item_id))
