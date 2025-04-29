from fastapi import APIRouter, Depends, HTTPException, status
from typing import List
from app.schemas.user import User, UserCreate, UserUpdate
from app.crud.user import get_user, get_users, create_user, update_user
from app.api.deps import get_current_user, get_db
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter()

@router.get("/me", response_model=User)
async def read_user_me(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Получить текущего пользователя"""
    return current_user

@router.put("/me", response_model=User)
async def update_user_me(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Обновить текущего пользователя"""
    user = await update_user(db, current_user["email"], user_in)
    return user 