from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

# Общие свойства
class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None
    is_active: bool = True
    is_superuser: bool = False

# Свойства для создания пользователя
class UserCreate(UserBase):
    password: str

# Свойства для обновления пользователя
class UserUpdate(UserBase):
    password: Optional[str] = None

# Свойства, хранящиеся в БД
class UserInDB(UserBase):
    id: str = Field(..., alias="_id")
    hashed_password: str

    class Config:
        json_encoders = {
            ObjectId: str
        }
        populate_by_name = True

# Дополнительные свойства для возврата через API
class User(UserBase):
    id: str = Field(alias="_id")

    class Config:
        json_encoders = {ObjectId: str}

class UserProfile(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: bool = True
    role: str = "user"
    department: Optional[str] = None
    position: Optional[str] = None

class UserProfileCreate(UserProfile):
    pass

class UserProfileUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None
    role: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None

class UserRoleCreate(BaseModel):
    name: str
    description: Optional[str] = None

class UserRoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None 