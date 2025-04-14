from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Union
import os
import logging
from jose import jwt, JWTError
from passlib.context import CryptContext
from dotenv import load_dotenv

# Настройка логирования
logger = logging.getLogger(__name__)

# Загрузка переменных окружения из файла .env
load_dotenv()

# Получение настроек безопасности из переменных окружения
SECRET_KEY = os.getenv("JWT_SECRET", "your-secret-key")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

if SECRET_KEY == "your-secret-key":
    logger.warning("Используется стандартный секретный ключ. В продакшене следует заменить его на реальный ключ.")

# Создание контекста для хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Проверка соответствия пароля хешированному значению
    
    Args:
        plain_password: Обычный пароль для проверки
        hashed_password: Хешированный пароль из базы данных
        
    Returns:
        bool: True, если пароль верный, иначе False
    """
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception as e:
        logger.error(f"Ошибка при проверке пароля: {str(e)}")
        return False

def get_password_hash(password: str) -> str:
    """
    Получение хеша пароля
    
    Args:
        password: Пароль для хеширования
        
    Returns:
        str: Хешированный пароль
    """
    return pwd_context.hash(password)

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """
    Создание JWT токена
    
    Args:
        data: Данные для включения в токен
        expires_delta: Время жизни токена
        
    Returns:
        str: Сгенерированный JWT токен
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    to_encode.update({"iat": datetime.utcnow()})  # Добавляем время создания токена
    
    try:
        encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
        return encoded_jwt
    except Exception as e:
        logger.error(f"Ошибка при создании токена: {str(e)}")
        raise

def decode_token(token: str) -> Dict[str, Any]:
    """
    Декодирование JWT токена
    
    Args:
        token: JWT токен для декодирования
        
    Returns:
        Dict[str, Any]: Данные из токена или пустой словарь в случае ошибки
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        logger.warning("Токен просрочен")
        return {}
    except jwt.JWTError as e:
        logger.warning(f"Ошибка при декодировании токена: {str(e)}")
        return {}
    except Exception as e:
        logger.error(f"Непредвиденная ошибка при декодировании токена: {str(e)}")
        return {}

def validate_password(password: str) -> bool:
    """
    Проверка надежности пароля
    
    Args:
        password: Пароль для проверки
        
    Returns:
        bool: True, если пароль надежный, иначе False
    """
    # Минимальная длина пароля
    if len(password) < 8:
        return False
    
    # Пароль должен содержать хотя бы одну цифру
    if not any(char.isdigit() for char in password):
        return False
    
    # Пароль должен содержать хотя бы одну букву
    if not any(char.isalpha() for char in password):
        return False
    
    return True 