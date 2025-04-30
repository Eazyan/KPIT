from typing import Any, Dict, Optional, Union
from fastapi.encoders import jsonable_encoder
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core.security import get_password_hash, verify_password
from app.crud.base import CRUDBase
from app.models.user import User, UserCreate, UserUpdate
from app.schemas.user import User as UserSchema
from sqlalchemy.orm import Session
from app.models.auth import User
from app.schemas.auth import UserCreate, UserUpdate
from bson import ObjectId

class CRUDUser(CRUDBase[User, UserCreate, UserUpdate]):
    async def get_by_email(self, db: AsyncIOMotorDatabase, *, email: str) -> Optional[User]:
        document = await db["users"].find_one({"email": email})
        return User(**document) if document else None

    async def create(self, db: AsyncIOMotorDatabase, *, obj_in: UserCreate) -> User:
        db_obj = User(
            email=obj_in.email,
            hashed_password=get_password_hash(obj_in.password),
            full_name=obj_in.full_name,
            is_active=obj_in.is_active,
            is_superuser=obj_in.is_superuser,
        )
        await db["users"].insert_one(db_obj.dict())
        return db_obj

    async def update(
        self,
        db: AsyncIOMotorDatabase,
        *,
        db_obj: User,
        obj_in: Union[UserUpdate, Dict[str, Any]]
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

    async def authenticate(
        self, db: AsyncIOMotorDatabase, *, email: str, password: str
    ) -> Optional[User]:
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

user = CRUDUser(User)

def get_user(db: Session, user_id: int) -> User:
    return db.query(User).filter(User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> User:
    return db.query(User).filter(User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(User).offset(skip).limit(limit).all()

def create_user(db: Session, user: UserCreate) -> User:
    hashed_password = get_password_hash(user.password)
    db_user = User(
        email=user.email,
        hashed_password=hashed_password,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user(db: Session, user_id: int, user: UserUpdate) -> User:
    db_user = get_user(db, user_id)
    if not db_user:
        return None
    
    update_data = user.model_dump(exclude_unset=True)
    if "password" in update_data:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    for field, value in update_data.items():
        setattr(db_user, field, value)
    
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, user_id: int) -> bool:
    db_user = get_user(db, user_id)
    if not db_user:
        return False
    
    db.delete(db_user)
    db.commit()
    return True

# Асинхронные методы для работы с MongoDB
async def get_user_by_id_mongo(db: AsyncIOMotorDatabase, user_id: str) -> Optional[User]:
    user = await db["users"].find_one({"_id": ObjectId(user_id)})
    if user:
        return User(**user)
    return None

async def get_user_by_email(db: AsyncIOMotorDatabase, email: str) -> Optional[User]:
    print(f"Looking for user with email: {email}")
    try:
        user = await db["users"].find_one({"email": email})
        print(f"Found user: {user}")
        if user:
            # Преобразуем ObjectId в строку
            user["_id"] = str(user["_id"])
            return User(**user)
        print("User not found")
        return None
    except Exception as e:
        print(f"Error in get_user_by_email: {str(e)}")
        return None

async def create_user_mongo(db: AsyncIOMotorDatabase, user: UserCreate) -> User:
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict(exclude={"password"})
    user_dict["hashed_password"] = hashed_password
    result = await db["users"].insert_one(user_dict)
    user_dict["_id"] = result.inserted_id
    return User(**user_dict) 