from typing import Optional, Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from pydantic import ValidationError
from motor.motor_asyncio import AsyncIOMotorDatabase
import aiohttp

from app.core.config import settings
from app.models.user import TokenData, User, UserProfile
from app.db.mongodb import get_database
from app.crud.user import get_user_by_email

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.AUTH_SERVICE_URL}/token")

async def get_db() -> Generator[AsyncIOMotorDatabase, None, None]:
    from app.db.session import SessionLocal
    async with SessionLocal() as session:
        yield session

async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserProfile:
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{settings.AUTH_SERVICE_URL}/users/me",
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            if response.status == 401:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Неверный токен",
                    headers={"WWW-Authenticate": "Bearer"},
                )
            user_data = await response.json()
            return UserProfile(**user_data)

async def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user

async def get_current_active_superuser(
    current_user: User = Depends(get_current_user),
) -> User:
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=400, detail="The user doesn't have enough privileges"
        )
    return current_user 