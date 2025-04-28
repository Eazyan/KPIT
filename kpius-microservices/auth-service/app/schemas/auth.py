from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from enum import Enum

from app.models.user import Role

class UserCreate(BaseModel):
    """Схема для создания пользователя"""
    name: str
    email: EmailStr
    password: str
    role: Role = Role.STUDENT
    group: Optional[str] = None
    department: Optional[str] = None

class UserLogin(BaseModel):
    """Схема для входа пользователя"""
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    """Схема ответа с данными пользователя"""
    id: str = Field(..., alias="_id")
    name: str
    email: EmailStr
    role: Role
    group: Optional[str] = None
    department: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        allow_population_by_field_name = True
        orm_mode = True

class Token(BaseModel):
    """Схема токена доступа"""
    access_token: str
    token_type: str

class TokenPayload(BaseModel):
    """Схема полезной нагрузки токена"""
    sub: Optional[str] = None
    exp: Optional[int] = None 