import time
import jwt
import os
from typing import Dict, Optional

# Секретный ключ для JWT
JWT_SECRET = os.environ.get("JWT_SECRET", "secret_key_for_dev_only")
# Алгоритм шифрования
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")

def token_response(token: str):
    """
    Возвращает генерируемый токен в формате
    """
    return {
        "access_token": token,
        "token_type": "bearer"
    }

def sign_jwt(user_id: str, role: str) -> Dict[str, str]:
    """
    Подписывает JWT-токен с данными пользователя
    """
    # Задаем срок действия токена (1 день)
    expiry = time.time() + 24 * 60 * 60
    
    payload = {
        "user_id": user_id,
        "role": role,
        "expires": expiry
    }
    
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    
    return token_response(token)

def decode_jwt(token: str) -> Optional[Dict]:
    """
    Декодирует JWT-токен и возвращает пользовательские данные
    """
    try:
        decoded_token = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        
        # Проверяем, не истек ли срок действия токена
        if decoded_token.get("expires") >= time.time():
            return decoded_token
        else:
            return None
            
    except Exception as e:
        print(f"Ошибка при декодировании JWT: {str(e)}")
        return None 