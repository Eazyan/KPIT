from typing import Optional, List, Annotated
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import logging

from ..core.security import decode_token
from ..models.user import UserRole, TokenData

# Настройка логирования
logger = logging.getLogger(__name__)

# OAuth2 с использованием Bearer Token для получения токена из заголовка Authorization
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)

async def get_current_user(token: Optional[str] = Depends(oauth2_scheme)) -> Optional[TokenData]:
    """
    Получение текущего пользователя из токена
    
    Args:
        token: JWT токен из заголовка Authorization
        
    Returns:
        TokenData: Данные пользователя из токена или None, если токен недействителен
    """
    if not token:
        return None
    
    try:
        payload = decode_token(token)
        
        if not payload:
            logger.warning("Получен пустой payload при декодировании токена")
            return None
            
        user_id = payload.get("sub")
        user_role = payload.get("role")
        
        if not user_id or not user_role:
            logger.warning(f"Отсутствуют обязательные поля в токене: id={user_id}, role={user_role}")
            return None
        
        # Проверка валидности роли
        try:
            role = UserRole(user_role)
        except ValueError:
            logger.warning(f"Недопустимая роль пользователя: {user_role}")
            return None
            
        token_data = TokenData(id=user_id, role=role)
        return token_data
        
    except JWTError as e:
        logger.error(f"Ошибка при декодировании токена: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Непредвиденная ошибка при обработке токена: {str(e)}")
        return None

async def get_current_active_user(
    current_user: Optional[TokenData] = Depends(get_current_user)
) -> TokenData:
    """
    Проверка, что токен содержит валидного пользователя
    
    Args:
        current_user: Данные пользователя из токена
        
    Returns:
        TokenData: Валидные данные пользователя
        
    Raises:
        HTTPException: Если токен недействителен или отсутствует
    """
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Необходима авторизация. Токен недействителен или отсутствует.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return current_user

def check_roles(allowed_roles: List[UserRole]):
    """
    Проверка роли пользователя
    
    Args:
        allowed_roles: Список разрешенных ролей
        
    Returns:
        Функция проверки роли пользователя
    """
    async def role_checker(current_user: TokenData = Security(get_current_active_user)):
        if current_user.role not in allowed_roles:
            roles_str = ", ".join([role.value for role in allowed_roles])
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Доступ запрещен. Требуются права: {roles_str}. Ваша роль: {current_user.role}."
            )
        return current_user
    
    return role_checker 