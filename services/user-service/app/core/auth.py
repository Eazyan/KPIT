from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from jose import JWTError, jwt
from passlib.context import CryptContext
from app.core.config import settings
from bson import ObjectId
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.models.user import User, TokenData
from app.deps import get_db
from app.core.security import verify_password

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверяет пароль"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    """Хеширует пароль"""
    return pwd_context.hash(password)

async def register_user(db: AsyncIOMotorDatabase, user_data: dict):
    """Регистрирует нового пользователя"""
    # Проверяем, существует ли уже пользователь с таким email
    existing_user = await db.users.find_one({"email": user_data["email"]})
    if existing_user:
        return None
    
    # Создаем нового пользователя
    user_id = await db.users.insert_one(user_data)
    new_user = await db.users.find_one({"_id": user_id.inserted_id})
    return new_user

async def authenticate_user(db: AsyncIOMotorDatabase, email: str, password: str):
    """Проверяет учетные данные пользователя"""
    user = await db.users.find_one({"email": email})
    if not user:
        return None
    if not verify_password(password, user["password_hash"]):
        return None
    return user

async def create_access_token(db: AsyncIOMotorDatabase, user: dict):
    """Создает токен доступа для пользователя"""
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    expire = datetime.utcnow() + access_token_expires
    
    # Создаем данные токена
    to_encode = {
        "sub": user["email"],
        "exp": expire,
        "role": user.get("role", "user")
    }
    
    # Создаем JWT токен
    access_token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    
    return {"access_token": access_token, "token_type": "bearer"}

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncIOMotorDatabase = Depends(get_db)):
    """Получает текущего пользователя из токена"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"email": email})
    if user is None:
        raise credentials_exception
    return user 