from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from bson import ObjectId

class UserBase(BaseModel):
    username: str
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: bool = True
    is_superuser: bool = False
    department: Optional[str] = None
    position: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserUpdate(UserBase):
    password: Optional[str] = None

class UserInDB(UserBase):
    id: str = Field(..., alias="_id")
    hashed_password: str

    class Config:
        json_encoders = {
            ObjectId: str
        }
        populate_by_name = True 