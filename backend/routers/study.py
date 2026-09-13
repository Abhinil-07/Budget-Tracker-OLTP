from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional
from supabase import AsyncClient
from supabase_auth import User
from datetime import date

from db.supabase import get_supabase
from dependencies import get_current_user
from services.study_service import StudyService
from models.study import (
    StudyLogResponse, CreateStudyLogDto, UpdateStudyLogDto,
    StudyGoalResponse, CreateStudyGoalDto, UpdateStudyGoalDto,
    DeleteResponse
)
from models.envelope import ApiResponse

router = APIRouter(prefix="/study", tags=["study"])

def get_study_service(supabase: AsyncClient = Depends(get_supabase)) -> StudyService:
    return StudyService(supabase)

# Study Logs
@router.get("", response_model=ApiResponse[List[StudyLogResponse]])
async def list_study_logs(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    service: StudyService = Depends(get_study_service)
):
    logs = await service.list_study_logs(str(current_user.id), date_from, date_to)
    return ApiResponse(data=logs)

@router.post("", response_model=ApiResponse[StudyLogResponse], status_code=status.HTTP_201_CREATED)
async def create_study_log(
    dto: CreateStudyLogDto,
    current_user: User = Depends(get_current_user),
    service: StudyService = Depends(get_study_service)
):
    log = await service.create_study_log(dto, str(current_user.id))
    return ApiResponse(data=log)

@router.patch("/{log_id}", response_model=ApiResponse[StudyLogResponse])
async def update_study_log(
    log_id: str,
    dto: UpdateStudyLogDto,
    current_user: User = Depends(get_current_user),
    service: StudyService = Depends(get_study_service)
):
    log = await service.update_study_log(log_id, dto, str(current_user.id))
    return ApiResponse(data=log)

@router.delete("/{log_id}", response_model=ApiResponse[DeleteResponse])
async def delete_study_log(
    log_id: str,
    current_user: User = Depends(get_current_user),
    service: StudyService = Depends(get_study_service)
):
    await service.delete_study_log(log_id, str(current_user.id))
    return ApiResponse(data=DeleteResponse(id=log_id))

# Study Goals
@router.get("/goals", response_model=ApiResponse[List[StudyGoalResponse]])
async def list_study_goals(
    current_user: User = Depends(get_current_user),
    service: StudyService = Depends(get_study_service)
):
    goals = await service.list_study_goals(str(current_user.id))
    return ApiResponse(data=goals)

@router.post("/goals", response_model=ApiResponse[StudyGoalResponse], status_code=status.HTTP_201_CREATED)
async def create_study_goal(
    dto: CreateStudyGoalDto,
    current_user: User = Depends(get_current_user),
    service: StudyService = Depends(get_study_service)
):
    goal = await service.create_study_goal(dto, str(current_user.id))
    return ApiResponse(data=goal)

@router.patch("/goals/{goal_id}", response_model=ApiResponse[StudyGoalResponse])
async def update_study_goal(
    goal_id: str,
    dto: UpdateStudyGoalDto,
    current_user: User = Depends(get_current_user),
    service: StudyService = Depends(get_study_service)
):
    goal = await service.update_study_goal(goal_id, dto, str(current_user.id))
    return ApiResponse(data=goal)

@router.delete("/goals/{goal_id}", response_model=ApiResponse[DeleteResponse])
async def delete_study_goal(
    goal_id: str,
    current_user: User = Depends(get_current_user),
    service: StudyService = Depends(get_study_service)
):
    await service.delete_study_goal(goal_id, str(current_user.id))
    return ApiResponse(data=DeleteResponse(id=goal_id))
