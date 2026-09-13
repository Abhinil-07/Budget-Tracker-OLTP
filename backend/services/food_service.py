from datetime import datetime, timezone
from supabase import AsyncClient
from typing import List, Optional
from datetime import date

from models.food import MealLog, CreateMealLogDto, UpdateMealLogDto
from exceptions import NotFoundError, ValidationError

class FoodService:
    def __init__(self, db: AsyncClient):
        self.db = db

    async def list_meal_logs(self, user_id: str, date_from: Optional[date] = None, date_to: Optional[date] = None) -> List[MealLog]:
        query = self.db.table("meal_logs").select("*").eq("user_id", user_id)
        
        if date_from:
            query = query.gte("meal_date", date_from.isoformat())
        if date_to:
            query = query.lte("meal_date", date_to.isoformat())
            
        response = await query.order("meal_date", desc=True).execute()
        return [MealLog(**row) for row in response.data]

    async def create_meal_log(self, dto: CreateMealLogDto, user_id: str) -> MealLog:
        data = {
            "user_id": user_id,
            "meal_date": dto.meal_date.isoformat(),
            "meal_slot": dto.meal_slot,
            "what_i_ate": dto.what_i_ate,
            "tag": dto.tag,
            "notes": dto.notes,
        }
        response = await self.db.table("meal_logs").insert(data).execute()
        if not response.data:
            raise ValidationError("Failed to create meal log")
            
        return MealLog(**response.data[0])

    async def update_meal_log(self, log_id: str, dto: UpdateMealLogDto, user_id: str) -> MealLog:
        check_response = (
            await self.db.table("meal_logs")
            .select("*")
            .eq("id", log_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not check_response.data:
            raise NotFoundError("Meal log not found or access denied")

        update_data = {
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if dto.meal_date is not None:
            update_data["meal_date"] = dto.meal_date.isoformat()
        if dto.meal_slot is not None:
            update_data["meal_slot"] = dto.meal_slot
        if dto.what_i_ate is not None:
            update_data["what_i_ate"] = dto.what_i_ate
        if dto.tag is not None:
            update_data["tag"] = dto.tag
        if dto.notes is not None:
            update_data["notes"] = dto.notes

        response = (
            await self.db.table("meal_logs")
            .update(update_data)
            .eq("id", log_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not response.data:
            raise NotFoundError("Failed to update meal log")

        return MealLog(**response.data[0])

    async def delete_meal_log(self, log_id: str, user_id: str) -> None:
        check_response = (
            await self.db.table("meal_logs")
            .select("*")
            .eq("id", log_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not check_response.data:
            raise NotFoundError("Meal log not found")

        await self.db.table("meal_logs").delete().eq("id", log_id).eq("user_id", user_id).execute()
