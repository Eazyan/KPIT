from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.auth import get_current_user
from app.db.session import get_db

router = APIRouter()

class UserProfile(BaseModel):
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    role: str = "user"

class UserProfileUpdate(BaseModel):
    full_name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None

@router.get("/me", response_model=UserProfile)
async def get_own_profile(
    current_user = Depends(get_current_user),
):
    return UserProfile(**current_user)

@router.get("/{username}", response_model=UserProfile)
async def get_user_profile(
    username: str,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    # Проверяем права доступа
    if current_user.get("role") not in ["admin", "manager"] and current_user.get("username") != username:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра этого профиля"
        )
    
    user = await db.users.find_one({"username": username})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    return UserProfile(**user)

@router.put("/me", response_model=UserProfile)
async def update_own_profile(
    profile: UserProfileUpdate,
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    update_data = {k: v for k, v in profile.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Нет данных для обновления"
        )
    
    await db.users.update_one(
        {"email": current_user["email"]}, 
        {"$set": update_data}
    )
    
    updated_user = await db.users.find_one({"email": current_user["email"]})
    return UserProfile(**updated_user)

@router.get("/", response_model=List[UserProfile])
async def list_users(
    current_user = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    skip: int = 0,
    limit: int = 10
):
    # Проверяем права доступа
    if current_user.get("role") not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра списка пользователей"
        )
    
    users = await db.users.find().skip(skip).limit(limit).to_list(length=limit)
    return [UserProfile(**user) for user in users] 