from typing import Optional
from pydantic import BaseModel, EmailStr

class Token(BaseModel):
    """
    Схема токена доступа
    """
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    """
    Данные внутри токена
    """
    sub: Optional[str] = None
    email: Optional[str] = None
    role: Optional[str] = None


class LoginRequest(BaseModel):
    """
    Запрос на авторизацию
    """
    email: EmailStr
    password: str 