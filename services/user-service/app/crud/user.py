from typing import Any, Dict, Optional, Union, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncSession, *, email: str) -> Optional[User]:
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(self, db: AsyncSession, *, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            is_superuser=obj_in.is_superuser,
        )
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self, db: AsyncSession, *, db_obj: User, obj_in: Union[UserUpdate, Dict[str, Any]]
    ) -> User:
        if isinstance(obj_in, dict):
            update_data = obj_in
        else:
            update_data = obj_in.dict(exclude_unset=True)
        if update_data.get("password"):
            hashed_password = get_password_hash(update_data["password"])
            del update_data["password"]
            update_data["hashed_password"] = hashed_password
        return await super().update(db, db_obj=db_obj, obj_in=update_data)

    async def authenticate(self, db: AsyncSession, *, email: str, password: str) -> Optional[User]:
        user = await self.get_by_email(db, email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def is_active(self, user: User) -> bool:
        return user.is_active

    def is_superuser(self, user: User) -> bool:
        return user.is_superuser

async def get_user_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[Dict[str, Any]]:
    user = await db.users.find_one({"email": email})
    return user

async def get_user(db: AsyncIOMotorDatabase, user_id: str) -> Optional[Dict[str, Any]]:
    user = await db.users.find_one({"_id": user_id})
    return user

async def get_users(
    db: AsyncIOMotorDatabase,
    skip: int = 0,
    limit: int = 100
) -> List[Dict[str, Any]]:
    cursor = db.users.find().skip(skip).limit(limit)
    users = await cursor.to_list(length=limit)
    return users

async def create_user(db: AsyncIOMotorDatabase, *, obj_in: UserCreate) -> Dict[str, Any]:
    db_obj = {
        "email": obj_in.email,
        "hashed_password": get_password_hash(obj_in.password),
        "full_name": obj_in.full_name,
        "is_active": True,
        "role": "user"
    }
    result = await db.users.insert_one(db_obj)
    db_obj["id"] = str(result.inserted_id)
    return db_obj

async def update_user(
    db: AsyncIOMotorDatabase,
    email: str,
    obj_in: Union[UserUpdate, Dict[str, Any]]
) -> Dict[str, Any]:
    if isinstance(obj_in, dict):
        update_data = obj_in
    else:
        update_data = obj_in.dict(exclude_unset=True)
    if update_data.get("password"):
        hashed_password = get_password_hash(update_data["password"])
        del update_data["password"]
        update_data["hashed_password"] = hashed_password
    
    result = await db.users.update_one(
        {"email": email},
        {"$set": update_data}
    )
    if result.modified_count == 0:
        raise ValueError("Пользователь не найден")
    
    user = await get_user_by_email(db, email)
    return user

user = CRUDUser(User) 