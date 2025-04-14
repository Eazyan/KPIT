from typing import Any
from datetime import timedelta, datetime
import logging
from fastapi import APIRouter, Depends, HTTPException, status, Path, Body
from fastapi.security import OAuth2PasswordRequestForm
from bson import ObjectId

from ...core.database import users_collection
from ...core.security import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    create_access_token,
    verify_password,
    get_password_hash,
    validate_password
)
from ...models.user import User, UserCreate, Token, UserInDB, UserRole
from ...middlewares.auth import get_current_active_user, TokenData, check_roles

# Настройка логирования
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/login", response_model=Any, summary="Вход пользователя", status_code=status.HTTP_200_OK)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()) -> Any:
    """
    Вход пользователя в систему и получение JWT токена
    
    Args:
        form_data: Данные формы входа (username и password)
        
    Returns:
        Данные пользователя с токеном доступа
        
    Raises:
        HTTPException: Если предоставлены неверные учетные данные
    """
    logger.info(f"Попытка входа для пользователя: {form_data.username}")
    user = users_collection.find_one({"email": form_data.username})
    
    if not user:
        logger.warning(f"Пользователь не найден: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(form_data.password, user["password_hash"]):
        logger.warning(f"Неверный пароль для пользователя: {form_data.username}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Неверный email или пароль",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Создание токена доступа
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": str(user["_id"]), "role": user["role"]},
        expires_delta=access_token_expires,
    )
    
    logger.info(f"Успешный вход для пользователя: {form_data.username}")
    
    # Возвращаем формат, который ожидает клиент
    return {
        "_id": str(user["_id"]),
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "group": user.get("group"),
        "department": user.get("department"),
        "token": access_token
    }


@router.post("/register", response_model=Any, summary="Регистрация пользователя", status_code=status.HTTP_201_CREATED)
async def register_user(user_data: UserCreate = Body(..., description="Данные нового пользователя")) -> Any:
    """
    Регистрация нового пользователя
    
    Args:
        user_data: Данные нового пользователя
        
    Returns:
        Данные созданного пользователя с токеном доступа
        
    Raises:
        HTTPException: Если пользователь с таким email уже существует или пароль недостаточно надежный
    """
    logger.info(f"Попытка регистрации пользователя с email: {user_data.email}")
    
    # Проверка, существует ли пользователь с таким email
    if users_collection.find_one({"email": user_data.email}):
        logger.warning(f"Пользователь с email {user_data.email} уже существует")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пользователь с таким email уже существует",
        )
    
    # Проверка надежности пароля
    if not validate_password(user_data.password):
        logger.warning(f"Ненадежный пароль при регистрации: {user_data.email}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Пароль должен содержать минимум 8 символов, включая буквы и цифры",
        )
    
    # Хеширование пароля
    password_hash = get_password_hash(user_data.password)
    
    # Создание документа пользователя
    try:
        user_dict = user_data.model_dump()
        del user_dict["password"]  # Удаляем обычный пароль из словаря
        
        user_in_db = {
            **user_dict,
            "password_hash": password_hash,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        
        # Добавление пользователя в базу данных
        result = users_collection.insert_one(user_in_db)
        
        # Получение созданного пользователя
        created_user = users_collection.find_one({"_id": result.inserted_id})
        
        if not created_user:
            logger.error(f"Ошибка при создании пользователя: {user_data.email}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при создании пользователя",
            )
            
        # Создание токена доступа
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": str(created_user["_id"]), "role": created_user["role"]},
            expires_delta=access_token_expires,
        )
        
        logger.info(f"Пользователь успешно зарегистрирован: {user_data.email}")
        
        # Возвращаем формат, который ожидает клиент
        return {
            "_id": str(created_user["_id"]),
            "name": created_user["name"],
            "email": created_user["email"],
            "role": created_user["role"],
            "group": created_user.get("group"),
            "department": created_user.get("department"),
            "token": access_token
        }
    except Exception as e:
        logger.error(f"Ошибка при регистрации пользователя {user_data.email}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка сервера при регистрации пользователя",
        )


@router.get("/profile", response_model=Any, summary="Получение профиля")
async def get_user_profile(
    current_user: TokenData = Depends(get_current_active_user)
) -> Any:
    """
    Получение профиля текущего пользователя
    
    Args:
        current_user: Данные текущего пользователя из токена
        
    Returns:
        Данные профиля пользователя
        
    Raises:
        HTTPException: Если пользователь не найден
    """
    try:
        user = users_collection.find_one({"_id": ObjectId(current_user.id)})
        
        if not user:
            logger.warning(f"Пользователь не найден при получении профиля: {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )
        
        logger.info(f"Успешное получение профиля пользователя: {user['email']}")
        
        # Возвращаем формат, который ожидает клиент
        return {
            "_id": str(user["_id"]),
            "name": user["name"],
            "email": user["email"],
            "role": user["role"],
            "group": user.get("group"),
            "department": user.get("department"),
        }
    except Exception as e:
        logger.error(f"Ошибка при получении профиля пользователя {current_user.id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка сервера при получении профиля пользователя",
        ) 