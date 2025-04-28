from datetime import datetime, timedelta
from typing import Optional, Union, Any

from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import get_settings
from app.models.user import User, UserInDB
from app.schemas.auth import TokenPayload
from app.services.auth_service import AuthService

settings = get_settings()
auth_service = AuthService()

# Настройка схемы OAuth2
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login/oauth"
)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Создание JWT токена доступа
    """
    return auth_service.create_access_token(data, expires_delta)

async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Получение текущего пользователя по токену
    """
    try:
        # Декодируем JWT токен
        payload = jwt.decode(
            token, settings.JWT_SECRET, algorithms=[settings.ALGORITHM]
        )
        token_data = TokenPayload(**payload)
        
        # Проверяем срок действия токена
        if datetime.fromtimestamp(token_data.exp) < datetime.now():
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Срок действия токена истек",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недействительные учетные данные",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Получаем пользователя из базы данных по ID из токена
    user = await auth_service.get_user_by_id(token_data.sub)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Пользователь не найден"
        )
    
    return user 