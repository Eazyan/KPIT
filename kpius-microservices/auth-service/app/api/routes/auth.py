from datetime import timedelta
from typing import Any, List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from bson import ObjectId

from app.core.config import get_settings
from app.models.user import User, UserCreate, UserUpdate
from app.schemas.token import Token, LoginRequest
from app.services.auth import authenticate_user, create_access_token, get_current_user
from app.services.users import create_user, get_users, get_user_by_id, update_user, delete_user
from app.core.auth import get_current_user, create_access_token
from app.schemas.auth import UserCreate, UserResponse, UserLogin
from app.services.auth_service import AuthService

settings = get_settings()
router = APIRouter()
auth_service = AuthService()


@router.post("/login", response_model=dict)
async def login_for_access_token(form_data: LoginRequest):
    """
    Авторизация пользователя и получение токена
    """
    user = await authenticate_user(form_data.email, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Создаем токен доступа
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role},
        expires_delta=access_token_expires
    )
    
    # Возвращаем данные пользователя и токен
    return {
        "_id": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "token": access_token,
        "group": user.group,
        "department": user.department
    }


@router.post("/login/oauth", response_model=dict)
async def login_oauth(form_data: OAuth2PasswordRequestForm = Depends()):
    """
    Авторизация через OAuth2 для совместимости со Swagger UI
    """
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Создаем токен доступа
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user.id), "email": user.email, "role": user.role},
        expires_delta=access_token_expires
    )
    
    # Возвращаем данные пользователя и токен
    return {
        "_id": str(user.id),
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "token": access_token,
        "group": user.group,
        "department": user.department
    }


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate) -> Any:
    """
    Регистрация нового пользователя
    """
    # Проверяем, что пользователь с таким email не существует
    if await auth_service.get_user_by_email(user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует"
        )
    
    # Создаем пользователя
    user = await auth_service.create_user(user_data)
    return user


@router.get("/user", response_model=UserResponse)
async def get_user_info(current_user: User = Depends(get_current_user)) -> Any:
    """
    Получение информации о текущем пользователе
    """
    return current_user


@router.get("/validate")
async def validate_token(current_user: User = Depends(get_current_user)) -> dict:
    """
    Валидация токена
    """
    return {"valid": True, "user_id": str(current_user.id)} 