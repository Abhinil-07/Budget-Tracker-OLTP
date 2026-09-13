from datetime import datetime, timezone
from supabase import AsyncClient
from typing import List, Optional

from models.media import MediaItem, CreateMediaItemDto, UpdateMediaItemDto
from exceptions import NotFoundError, ValidationError

class MediaService:
    def __init__(self, db: AsyncClient):
        self.db = db

    async def list_media_items(self, user_id: str, media_type: Optional[str] = None) -> List[MediaItem]:
        query = self.db.table("media_items").select("*").eq("user_id", user_id)
        
        if media_type:
            query = query.eq("media_type", media_type)
            
        response = await query.order("created_at", desc=True).execute()
        return [MediaItem(**row) for row in response.data]

    async def create_media_item(self, dto: CreateMediaItemDto, user_id: str) -> MediaItem:
        data = {
            "user_id": user_id,
            "title": dto.title,
            "media_type": dto.media_type,
            "status": dto.status,
            "rating": dto.rating,
            "notes": dto.notes,
            "url": dto.url,
        }
        response = await self.db.table("media_items").insert(data).execute()
        if not response.data:
            raise ValidationError("Failed to create media item")
            
        return MediaItem(**response.data[0])

    async def update_media_item(self, item_id: str, dto: UpdateMediaItemDto, user_id: str) -> MediaItem:
        check_response = (
            await self.db.table("media_items")
            .select("*")
            .eq("id", item_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not check_response.data:
            raise NotFoundError("Media item not found or access denied")

        update_data = {
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if dto.title is not None:
            update_data["title"] = dto.title
        if dto.media_type is not None:
            update_data["media_type"] = dto.media_type
        if dto.status is not None:
            update_data["status"] = dto.status
        if dto.rating is not None:
            update_data["rating"] = dto.rating
        if dto.notes is not None:
            update_data["notes"] = dto.notes
        if dto.url is not None:
            update_data["url"] = dto.url

        response = (
            await self.db.table("media_items")
            .update(update_data)
            .eq("id", item_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not response.data:
            raise NotFoundError("Failed to update media item")

        return MediaItem(**response.data[0])

    async def delete_media_item(self, item_id: str, user_id: str) -> None:
        check_response = (
            await self.db.table("media_items")
            .select("*")
            .eq("id", item_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not check_response.data:
            raise NotFoundError("Media item not found")

        await self.db.table("media_items").delete().eq("id", item_id).eq("user_id", user_id).execute()
