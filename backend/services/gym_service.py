from datetime import datetime, timezone
from supabase import AsyncClient
from typing import List, Optional
from datetime import date

from models.gym import GymSession, CreateGymSessionDto, UpdateGymSessionDto
from exceptions import NotFoundError, ValidationError

class GymService:
    def __init__(self, db: AsyncClient):
        self.db = db

    async def list_sessions(self, user_id: str, date_from: Optional[date] = None, date_to: Optional[date] = None) -> List[GymSession]:
        query = self.db.table("gym_sessions").select("*").eq("user_id", user_id)
        
        if date_from:
            query = query.gte("session_date", date_from.isoformat())
        if date_to:
            query = query.lte("session_date", date_to.isoformat())
            
        response = await query.order("session_date", desc=True).execute()
        return [GymSession(**row) for row in response.data]

    async def create_session(self, dto: CreateGymSessionDto, user_id: str) -> GymSession:
        data = {
            "user_id": user_id,
            "session_date": dto.session_date.isoformat(),
            "split_type": dto.split_type,
            "exercises": dto.exercises,
            "duration_minutes": dto.duration_minutes,
            "notes": dto.notes,
        }
        response = await self.db.table("gym_sessions").insert(data).execute()
        if not response.data:
            raise ValidationError("Failed to create gym session")
            
        return GymSession(**response.data[0])

    async def update_session(self, session_id: str, dto: UpdateGymSessionDto, user_id: str) -> GymSession:
        check_response = (
            await self.db.table("gym_sessions")
            .select("*")
            .eq("id", session_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not check_response.data:
            raise NotFoundError("Gym session not found or access denied")

        update_data = {
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if dto.session_date is not None:
            update_data["session_date"] = dto.session_date.isoformat()
        if dto.split_type is not None:
            update_data["split_type"] = dto.split_type
        if dto.exercises is not None:
            update_data["exercises"] = dto.exercises
        if dto.duration_minutes is not None:
            update_data["duration_minutes"] = dto.duration_minutes
        if dto.notes is not None:
            update_data["notes"] = dto.notes

        response = (
            await self.db.table("gym_sessions")
            .update(update_data)
            .eq("id", session_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not response.data:
            raise NotFoundError("Failed to update gym session")

        return GymSession(**response.data[0])

    async def delete_session(self, session_id: str, user_id: str) -> None:
        check_response = (
            await self.db.table("gym_sessions")
            .select("*")
            .eq("id", session_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not check_response.data:
            raise NotFoundError("Gym session not found")

        await self.db.table("gym_sessions").delete().eq("id", session_id).eq("user_id", user_id).execute()
