from fastapi import APIRouter, Depends, status, Query
from typing import List, Optional
from supabase import AsyncClient
from supabase_auth import User
from datetime import date

from db.supabase import get_supabase
from dependencies import get_current_user
from services.food_service import FoodService
from models.food import MealLogResponse, CreateMealLogDto, UpdateMealLogDto, DeleteResponse
from models.envelope import ApiResponse

router = APIRouter(prefix="/food", tags=["food"])

def get_food_service(supabase: AsyncClient = Depends(get_supabase)) -> FoodService:
    return FoodService(supabase)

@router.get("", response_model=ApiResponse[List[MealLogResponse]])
async def list_meal_logs(
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
    current_user: User = Depends(get_current_user),
    service: FoodService = Depends(get_food_service)
):
    logs = await service.list_meal_logs(str(current_user.id), date_from, date_to)
    return ApiResponse(data=logs)

@router.post("", response_model=ApiResponse[MealLogResponse], status_code=status.HTTP_201_CREATED)
async def create_meal_log(
    dto: CreateMealLogDto,
    current_user: User = Depends(get_current_user),
    service: FoodService = Depends(get_food_service)
):
    log = await service.create_meal_log(dto, str(current_user.id))
    return ApiResponse(data=log)

@router.patch("/{log_id}", response_model=ApiResponse[MealLogResponse])
async def update_meal_log(
    log_id: str,
    dto: UpdateMealLogDto,
    current_user: User = Depends(get_current_user),
    service: FoodService = Depends(get_food_service)
):
    log = await service.update_meal_log(log_id, dto, str(current_user.id))
    return ApiResponse(data=log)

@router.delete("/{log_id}", response_model=ApiResponse[DeleteResponse])
async def delete_meal_log(
    log_id: str,
    current_user: User = Depends(get_current_user),
    service: FoodService = Depends(get_food_service)
):
    await service.delete_meal_log(log_id, str(current_user.id))
    return ApiResponse(data=DeleteResponse(id=log_id))
