from datetime import datetime
from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId


class PyObjectId(ObjectId):
    """Класс для работы с ObjectId MongoDB в Pydantic"""
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return ObjectId(v)

    @classmethod
    def __modify_schema__(cls, field_schema):
        field_schema.update(type="string")


class Role(str, Enum):
    """Роли пользователей в системе"""
    ADMIN = "admin"
    TEACHER = "teacher"
    STUDENT = "student"


class User(BaseModel):
    """Базовая модель пользователя (без пароля)"""
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    email: EmailStr
    role: Role
    group: Optional[str] = None
    department: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        allow_population_by_field_name = True
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda dt: dt.isoformat(),
        }


class UserInDB(User):
    """Модель пользователя в базе данных (с хешированным паролем)"""
    hashed_password: str


class UserBase(BaseModel):
    """
    Базовая модель пользователя
    """
    email: EmailStr
    name: str
    role: Role = Role.STUDENT


class UserCreate(UserBase):
    """
    Модель для создания пользователя
    """
    password: str
    group: Optional[str] = None
    department: Optional[str] = None


class UserUpdate(BaseModel):
    """
    Модель для обновления пользователя
    """
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    password: Optional[str] = None
    role: Optional[Role] = None
    group: Optional[str] = None
    department: Optional[str] = None


class User(UserBase):
    """
    Модель пользователя для публичного API
    """
    id: str = Field(..., alias="_id")
    group: Optional[str] = None
    department: Optional[str] = None
    
    class Config:
        orm_mode = True
        allow_population_by_field_name = True 