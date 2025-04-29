from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from typing import Optional
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.db.session import get_db
from app.core.auth import get_current_user

router = APIRouter()

class UserCreate(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    password: str
    role: str = "user"

class UserLogin(BaseModel):
    email: str
    username: str
    role: str
    access_token: str
    token_type: str = "bearer"

@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserCreate)
async def register(user: UserCreate, db = Depends(get_db)):
    # Проверяем, существует ли пользователь с таким email
    existing_user = await db.users.find_one({"email": user.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )
    
    # Хешируем пароль
    user_dict = user.dict()
    user_dict["password_hash"] = get_password_hash(user.password)
    del user_dict["password"]  # Удаляем пароль из словаря
    
    # Сохраняем пользователя в базе данных
    await db.users.insert_one(user_dict)
    
    return user

@router.post("/login", response_model=UserLogin)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db = Depends(get_db)):
    # Ищем пользователя в базе данных
    user = await db.users.find_one({"email": form_data.username})
    if not user or not verify_password(form_data.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Создаем токен доступа
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"], "role": user["role"]},
        expires_delta=access_token_expires
    )
    
    return {
        "email": user["email"],
        "username": user["username"],
        "role": user["role"],
        "access_token": access_token,
        "token_type": "bearer"
    }

@router.get("/me", response_model=dict)
async def read_users_me(current_user = Depends(get_current_user)):
    return current_user 