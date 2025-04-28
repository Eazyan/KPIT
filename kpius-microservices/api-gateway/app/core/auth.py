from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import httpx

from app.core.config import get_settings

settings = get_settings()
security = HTTPBearer()

async def authenticate_request(credentials: HTTPAuthorizationCredentials = Depends(security)) -> str:
    """
    Аутентификация запроса через сервис аутентификации и возврат токена
    """
    token = credentials.credentials
    
    # Проверяем валидность токена через сервис аутентификации
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{settings.AUTH_SERVICE_URL}/api/v1/auth/validate",
                headers={"Authorization": f"Bearer {token}"},
                timeout=5.0
            )
            
            if response.status_code == 200:
                return token
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Недействительный токен аутентификации",
                    headers={"WWW-Authenticate": "Bearer"},
                )
        except httpx.RequestError:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Сервис аутентификации недоступен"
            ) 