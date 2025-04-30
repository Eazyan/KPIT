from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    is_active: bool = True
    is_superuser: bool = False

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserInDB(UserBase):
    id: str = Field(alias="_id")
    hashed_password: str
    created_at: datetime = Field(default_factory=lambda: datetime.now())
    updated_at: datetime = Field(default_factory=lambda: datetime.now())

class User(UserBase):
    id: str = Field(alias="_id")
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class TokenBase(BaseModel):
    user_id: str
    access_token: str
    refresh_token: str
    expires_at: datetime
    is_revoked: bool = False

class TokenCreate(TokenBase):
    pass

class TokenInDB(TokenBase):
    id: str = Field(alias="_id")
    created_at: datetime = Field(default_factory=lambda: datetime.now())

class Token(TokenBase):
    id: str = Field(alias="_id")
    created_at: datetime

    class Config:
        from_attributes = True 