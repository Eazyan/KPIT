from typing import Any, Union, Dict
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
from ...models.user import User, UserCreate, Token, UserInDB, UserRole, UserUpdate
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


@router.get("/user", response_model=User)
async def get_user_profile(
    current_user: Union[Dict, UserInDB] = Depends(get_current_active_user),
):
    """
    Получение профиля текущего пользователя
    """
    logger.info(f"Запрос профиля пользователя. current_user: {current_user}")
    
    try:
        # Извлекаем ID пользователя из current_user
        user_id = None
        
        # Проверяем разные форматы, в которых может прийти ID
        if hasattr(current_user, 'id'):
            user_id = current_user.id
            logger.debug(f"ID получен из атрибута id: {user_id}")
        elif hasattr(current_user, '_id'):
            user_id = current_user._id
            logger.debug(f"ID получен из атрибута _id: {user_id}")
        elif isinstance(current_user, dict):
            if 'id' in current_user:
                user_id = current_user['id']
                logger.debug(f"ID получен из словаря по ключу id: {user_id}")
            elif '_id' in current_user:
                user_id = current_user['_id']
                logger.debug(f"ID получен из словаря по ключу _id: {user_id}")
        
        if not user_id:
            logger.error(f"Не удалось получить ID пользователя из объекта: {current_user}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )
            
        # Если у нас уже есть все необходимые поля в current_user, возвращаем его
        if isinstance(current_user, UserInDB) or (
            isinstance(current_user, dict) and all(
                field in current_user for field in ['name', 'email', 'role']
            )
        ):
            logger.info(f"Возвращаем существующий профиль пользователя: {user_id}")
            if isinstance(current_user, dict):
                # Конвертируем словарь в объект User
                user_dict = dict(current_user)
                # Обеспечиваем наличие id вместо _id для совместимости с моделью User
                if '_id' in user_dict and 'id' not in user_dict:
                    user_dict['id'] = str(user_dict['_id'])
                return User(**user_dict)
            return current_user
            
        # Получаем полные данные пользователя из базы
        logger.debug(f"Поиск пользователя в базе данных по ID: {user_id}")
        
        try:
            # Пробуем преобразовать ID в ObjectId если это строка
            if isinstance(user_id, str):
                try:
                    object_id = ObjectId(user_id)
                except Exception:
                    object_id = user_id
            else:
                object_id = user_id
                
            user = users_collection.find_one({"_id": object_id})
        except Exception as e:
            logger.exception(f"Ошибка при поиске пользователя в базе: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Ошибка при поиске пользователя в базе данных"
            )
        
        if not user:
            logger.error(f"Пользователь с ID {user_id} не найден в базе данных")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден",
            )
            
        logger.info(f"Успешно получен профиль пользователя: {user['_id']}")
        # Преобразуем _id в id для совместимости с моделью User
        user_dict = dict(user)
        user_dict['id'] = str(user_dict['_id'])
        return User(**user_dict)
        
    except HTTPException:
        # Пробрасываем HTTP ошибки дальше
        raise
    except Exception as e:
        logger.exception(f"Непредвиденная ошибка при получении профиля: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении профиля пользователя"
        )


@router.put("/profile", response_model=User)
async def update_user_profile(user_update: UserUpdate, current_user: User = Depends(get_current_active_user)):
    """
    Обновление профиля пользователя
    """
    try:
        logger.info(f"Попытка обновления профиля пользователя с ID: {current_user.id}")
        user_collection = get_user_collection()
        
        # Проверяем наличие пользователя
        if not current_user:
            logger.error("Пользователь не найден при обновлении профиля")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        # Обновляем данные пользователя
        update_data = user_update.model_dump(exclude_unset=True)
        if not update_data:
            return current_user
            
        logger.debug(f"Данные для обновления: {update_data}")
        
        result = await user_collection.update_one(
            {"_id": current_user.id}, {"$set": update_data}
        )
        
        if result.modified_count == 0:
            logger.warning(f"Нет изменений при обновлении пользователя с ID: {current_user.id}")
        
        # Получаем обновленного пользователя
        updated_user = await user_collection.find_one({"_id": current_user.id})
        
        if not updated_user:
            logger.error(f"Не удалось найти пользователя после обновления: {current_user.id}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден после обновления"
            )
            
        logger.info(f"Успешно обновлен профиль пользователя с ID: {current_user.id}")
        return User.model_validate(updated_user)
        
    except Exception as e:
        logger.error(f"Ошибка при обновлении профиля пользователя {current_user.id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при обновлении профиля: {str(e)}"
        )


@router.get("/users/{user_id}", response_model=User)
async def get_user_by_id(user_id: str, current_user: User = Depends(get_current_active_user)):
    """
    Получение профиля пользователя по ID
    """
    try:
        logger.info(f"Попытка получения профиля пользователя с ID: {user_id}")
        user_collection = get_user_collection()
        
        # Поиск пользователя по ID
        user = await user_collection.find_one({"_id": user_id})
        
        if not user:
            logger.error(f"Пользователь с ID {user_id} не найден")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
            
        logger.info(f"Успешно получен профиль пользователя с ID: {user_id}")
        return User.model_validate(user)
        
    except Exception as e:
        logger.error(f"Ошибка при получении профиля пользователя {user_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении профиля: {str(e)}"
        ) 