from typing import Optional, List, Annotated
from fastapi import Depends, HTTPException, Security, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
import logging
from bson import ObjectId

from ..core.security import decode_token
from ..models.user import UserRole, TokenData, UserInDB
from ..core.database import users_collection

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
        logger.warning("Токен не предоставлен")
        return None
    
    try:
        logger.debug(f"Начало декодирования токена: {token[:10]}...")
        payload = decode_token(token)
        
        if not payload:
            logger.warning("Получен пустой payload при декодировании токена")
            return None
            
        # Проверяем обе возможные ключи для id: "sub" (стандартное) и "id" (наше приложение)
        user_id = payload.get("sub") or payload.get("id")
        user_role = payload.get("role")
        
        # Дополнительное логирование для диагностики
        logger.info(f"Расшифрованные данные из токена: user_id={user_id}, role={user_role}, полный payload: {payload}")
        
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
        logger.debug(f"Создан объект TokenData: id={token_data.id}, role={token_data.role}")
        return token_data
        
    except JWTError as e:
        logger.error(f"Ошибка при декодировании токена: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Непредвиденная ошибка при обработке токена: {str(e)}")
        return None

async def get_current_active_user(
    current_user: UserInDB = Depends(get_current_user),
):
    """
    Получение активного пользователя из базы данных
    """
    try:
        # Проверка получен ли пользователь
        if not current_user:
            logger.error(f"Не удалось получить активного пользователя: пользователь не найден")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Не удалось аутентифицировать пользователя",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Извлекаем ID пользователя
        user_id = None
        if hasattr(current_user, 'id'):
            user_id = current_user.id
        elif hasattr(current_user, '_id'):
            user_id = current_user._id
        elif isinstance(current_user, dict):
            user_id = current_user.get('id') or current_user.get('_id')
        
        if not user_id:
            logger.error(f"Не удалось определить ID пользователя: {current_user}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Некорректные данные пользователя",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
        logger.debug(f"Успешно получен активный пользователь с ID: {user_id}")
        return current_user
    
    except HTTPException:
        # Пробрасываем HTTP ошибки дальше
        raise
    except Exception as e:
        logger.exception(f"Ошибка при получении активного пользователя: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера при проверке пользователя",
            headers={"WWW-Authenticate": "Bearer"},
        )

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