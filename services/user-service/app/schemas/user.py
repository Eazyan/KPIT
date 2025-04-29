from typing import Optional
from pydantic import BaseModel, EmailStr

# Общие свойства
class UserBase(BaseModel):
    email: Optional[EmailStr] = None
    is_active: Optional[bool] = True
    full_name: Optional[str] = None
    role: Optional[str] = "user"

# Свойства для создания пользователя
class UserCreate(UserBase):
    email: EmailStr
    password: str
    full_name: str

# Свойства для обновления пользователя
class UserUpdate(UserBase):
    password: Optional[str] = None

# Свойства, хранящиеся в БД
class UserInDBBase(UserBase):
    id: Optional[str] = None

    class Config:
        from_attributes = True

# Дополнительные свойства для возврата через API
class User(UserInDBBase):
    pass

# Дополнительные свойства, хранящиеся в БД
class UserInDB(UserInDBBase):
    hashed_password: str 