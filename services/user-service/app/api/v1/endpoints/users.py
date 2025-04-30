from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.core.config import settings
from app.crud.user import UserCRUD
from app.schemas.user import UserCreate, UserUpdate, UserInDB, UserProfile, UserProfileUpdate
from app.core.security import get_current_user
from app.db.mongodb import MongoDB

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/login")

# Получаем экземпляр UserCRUD через зависимость
async def get_user_crud():
    db = MongoDB()
    try:
        yield UserCRUD(db)
    finally:
        await db.close()

@router.get("/", response_model=List[UserInDB])
async def read_users(
    skip: int = 0,
    limit: int = 100,
    user_crud: UserCRUD = Depends(get_user_crud)
):
    return await user_crud.get_multi(skip=skip, limit=limit)

@router.post("/", response_model=UserInDB)
async def create_new_user(
    user: UserCreate,
    user_crud: UserCRUD = Depends(get_user_crud)
):
    db_user = await user_crud.get_by_username(username=user.username)
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    if user.email:
        email_user = await user_crud.get_by_email(email=user.email)
        if email_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    return await user_crud.create(user_in=user)

@router.put("/me", response_model=UserInDB)
async def update_current_user(
    user_update: UserUpdate,
    current_user: UserInDB = Depends(get_current_user),
    user_crud: UserCRUD = Depends(get_user_crud)
):
    return await user_crud.update(user_id=current_user.id, user_in=user_update)

@router.get("/me", response_model=UserInDB)
async def read_current_user(
    current_user: UserInDB = Depends(get_current_user)
):
    return current_user

@router.get("/{user_id}", response_model=UserInDB)
async def read_user(
    user_id: str,
    user_crud: UserCRUD = Depends(get_user_crud)
):
    user = await user_crud.get_by_id(user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

@router.delete("/{user_id}")
async def delete_user_endpoint(
    user_id: str,
    user_crud: UserCRUD = Depends(get_user_crud)
):
    success = await user_crud.delete(user_id=user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return {"status": "success"}