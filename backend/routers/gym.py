from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional
from supabase import AsyncClient
from supabase_auth import User
from datetime import date

from db.supabase import get_supabase
from dependencies import get_current_user
from services.gym_service import GymService
from models.gym import GymSessionResponse, CreateGymSessionDto, UpdateGymSessionDto, DeleteResponse
from models.envelope import ApiResponse

router = APIRouter(prefix="/gym", tags=["gym"])

def get_gym_service(supabase: AsyncClient = Depends(get_supabase)) -> GymService:
    return GymService(supabase)

@router.get("", response_model=ApiResponse[List[GymSessionResponse]])
async def list_sessions(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    service: GymService = Depends(get_gym_service)
):
    sessions = await service.list_sessions(str(current_user.id), date_from, date_to)
    return ApiResponse(data=sessions)

@router.post("", response_model=ApiResponse[GymSessionResponse], status_code=status.HTTP_201_CREATED)
async def create_session(
    dto: CreateGymSessionDto,
    current_user: User = Depends(get_current_user),
    service: GymService = Depends(get_gym_service)
):
    session = await service.create_session(dto, str(current_user.id))
    return ApiResponse(data=session)

@router.patch("/{session_id}", response_model=ApiResponse[GymSessionResponse])
async def update_session(
    session_id: str,
    dto: UpdateGymSessionDto,
    current_user: User = Depends(get_current_user),
    service: GymService = Depends(get_gym_service)
):
    session = await service.update_session(session_id, dto, str(current_user.id))
    return ApiResponse(data=session)

@router.delete("/{session_id}", response_model=ApiResponse[DeleteResponse])
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    service: GymService = Depends(get_gym_service)
):
    await service.delete_session(session_id, str(current_user.id))
    return ApiResponse(data=DeleteResponse(id=session_id))
