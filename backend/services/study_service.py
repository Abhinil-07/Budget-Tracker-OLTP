from datetime import datetime, timezone
from supabase import AsyncClient
from typing import List, Optional
from datetime import date

from models.study import StudyLog, CreateStudyLogDto, UpdateStudyLogDto, StudyGoal, CreateStudyGoalDto, UpdateStudyGoalDto
from exceptions import NotFoundError, ValidationError

class StudyService:
    def __init__(self, db: AsyncClient):
        self.db = db

    # Study Logs
    async def list_study_logs(self, user_id: str, date_from: Optional[date] = None, date_to: Optional[date] = None) -> List[StudyLog]:
        query = self.db.table("study_logs").select("*").eq("user_id", user_id)
        
        if date_from:
            query = query.gte("study_date", date_from.isoformat())
        if date_to:
            query = query.lte("study_date", date_to.isoformat())
            
        response = await query.order("study_date", desc=True).execute()
        return [StudyLog(**row) for row in response.data]

    async def create_study_log(self, dto: CreateStudyLogDto, user_id: str) -> StudyLog:
        data = {
            "user_id": user_id,
            "study_date": dto.study_date.isoformat(),
            "topic": dto.topic,
            "minutes": dto.minutes,
            "notes": dto.notes,
        }
        response = await self.db.table("study_logs").insert(data).execute()
        if not response.data:
            raise ValidationError("Failed to create study log")
            
        return StudyLog(**response.data[0])

    async def update_study_log(self, log_id: str, dto: UpdateStudyLogDto, user_id: str) -> StudyLog:
        check_response = (
            await self.db.table("study_logs")
            .select("*")
            .eq("id", log_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not check_response.data:
            raise NotFoundError("Study log not found or access denied")

        update_data = {
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if dto.study_date is not None:
            update_data["study_date"] = dto.study_date.isoformat()
        if dto.topic is not None:
            update_data["topic"] = dto.topic
        if dto.minutes is not None:
            update_data["minutes"] = dto.minutes
        if dto.notes is not None:
            update_data["notes"] = dto.notes

        response = (
            await self.db.table("study_logs")
            .update(update_data)
            .eq("id", log_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not response.data:
            raise NotFoundError("Failed to update study log")

        return StudyLog(**response.data[0])

    async def delete_study_log(self, log_id: str, user_id: str) -> None:
        check_response = (
            await self.db.table("study_logs")
            .select("*")
            .eq("id", log_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not check_response.data:
            raise NotFoundError("Study log not found")

        await self.db.table("study_logs").delete().eq("id", log_id).eq("user_id", user_id).execute()

    # Study Goals
    async def list_study_goals(self, user_id: str) -> List[StudyGoal]:
        response = await self.db.table("study_goals").select("*").eq("user_id", user_id).order("month", desc=True).execute()
        return [StudyGoal(**row) for row in response.data]

    async def create_study_goal(self, dto: CreateStudyGoalDto, user_id: str) -> StudyGoal:
        data = {
            "user_id": user_id,
            "month": dto.month.isoformat(),
            "goal_text": dto.goal_text,
            "status": dto.status,
        }
        response = await self.db.table("study_goals").insert(data).execute()
        if not response.data:
            raise ValidationError("Failed to create study goal")
            
        return StudyGoal(**response.data[0])

    async def update_study_goal(self, goal_id: str, dto: UpdateStudyGoalDto, user_id: str) -> StudyGoal:
        check_response = (
            await self.db.table("study_goals")
            .select("*")
            .eq("id", goal_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not check_response.data:
            raise NotFoundError("Study goal not found or access denied")

        update_data = {
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        if dto.month is not None:
            update_data["month"] = dto.month.isoformat()
        if dto.goal_text is not None:
            update_data["goal_text"] = dto.goal_text
        if dto.status is not None:
            update_data["status"] = dto.status

        response = (
            await self.db.table("study_goals")
            .update(update_data)
            .eq("id", goal_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not response.data:
            raise NotFoundError("Failed to update study goal")

        return StudyGoal(**response.data[0])

    async def delete_study_goal(self, goal_id: str, user_id: str) -> None:
        check_response = (
            await self.db.table("study_goals")
            .select("*")
            .eq("id", goal_id)
            .eq("user_id", user_id)
            .execute()
        )
        if not check_response.data:
            raise NotFoundError("Study goal not found")

        await self.db.table("study_goals").delete().eq("id", goal_id).eq("user_id", user_id).execute()
