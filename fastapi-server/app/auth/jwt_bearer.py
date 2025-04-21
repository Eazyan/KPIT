from fastapi import Request, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from ..core.security import decode_token

class JWTBearer(HTTPBearer):
    def __init__(self, auto_error: bool = True):
        super(JWTBearer, self).__init__(auto_error=auto_error)

    async def __call__(self, request: Request):
        credentials: HTTPAuthorizationCredentials = await super(JWTBearer, self).__call__(request)
        if credentials:
            if not credentials.scheme == "Bearer":
                raise HTTPException(status_code=403, detail="Неверная схема аутентификации")
            if not self.verify_jwt(credentials.credentials):
                raise HTTPException(status_code=403, detail="Недействительный или просроченный токен")
            return credentials
        else:
            raise HTTPException(status_code=403, detail="Недопустимые данные авторизации")
            
    def verify_jwt(self, token: str) -> bool:
        try:
            payload = decode_token(token)
            return bool(payload)
        except:
            return False
            
async def get_current_user(credentials: HTTPAuthorizationCredentials = None):
    """
    Извлекает информацию о текущем пользователе из JWT токена
    """
    if not credentials:
        raise HTTPException(status_code=403, detail="Требуется аутентификация")
        
    try:
        token = credentials.credentials
        payload = decode_token(token)
        if not payload:
            raise HTTPException(status_code=403, detail="Недействительный или просроченный токен")
        return payload
    except Exception as e:
        raise HTTPException(status_code=403, detail=f"Ошибка аутентификации: {str(e)}") 