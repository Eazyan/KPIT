from datetime import datetime, timedelta
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError

from app.core.config import get_settings
from app.core.security import verify_password, create_access_token
from app.models.user import User, UserInDB
from app.schemas.token import TokenData
from app.services.users import get_user_by_email, get_user_by_id

settings = get_settings()

# OAuth2 схема для получения токена из заголовка Authorization
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/auth/login/oauth")


async def authenticate_user(email: str, password: str) -> Optional[UserInDB]:
    """
    Аутентификация пользователя по email и паролю
    """
    user = await get_user_by_email(email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Получение текущего аутентифицированного пользователя по токену
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Не удалось проверить учетные данные",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Декодируем JWT токен
        payload = jwt.decode(
            token, 
            settings.JWT_SECRET, 
            algorithms=[settings.ALGORITHM]
        )
        
        # Извлекаем данные пользователя
        user_id: str = payload.get("sub")
        email: str = payload.get("email")
        role: str = payload.get("role")
        
        if user_id is None:
            raise credentials_exception
        
        # Создаем объект TokenData
        token_data = TokenData(sub=user_id, email=email, role=role)
    except (JWTError, ValidationError):
        raise credentials_exception
    
    # Получаем пользователя из базы данных
    user = await get_user_by_id(token_data.sub)
    if user is None:
        raise credentials_exception
    
    # Преобразуем в модель User (без хеша пароля и другой внутренней информации)
    return User(
        _id=str(user.id),
        email=user.email,
        name=user.name,
        role=user.role,
        group=user.group,
        department=user.department
    ) 