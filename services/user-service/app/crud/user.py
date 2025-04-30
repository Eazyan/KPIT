from typing import Optional, List
from bson import ObjectId
from app.db.mongodb import MongoDB
from app.schemas.user import (
    UserCreate, UserUpdate, UserProfileCreate, 
    UserProfileUpdate, UserRoleCreate, UserRoleUpdate, 
    UserInDB, UserProfile
)
from app.core.security import get_password_hash, verify_password

class UserCRUD:
    def __init__(self, db: MongoDB):
        self.db = db
        self.collection = db.get_collection("users")
        self.profiles_collection = db.get_collection("profiles")
        self.roles_collection = db.get_collection("roles")

    async def get_by_id(self, user_id: str) -> Optional[UserInDB]:
        user = await self.collection.find_one({"_id": ObjectId(user_id)})
        if user:
            return UserInDB(**user)
        return None

    async def get_by_email(self, email: str) -> Optional[UserInDB]:
        user = await self.collection.find_one({"email": email})
        if user:
            return UserInDB(**user)
        return None

    async def get_by_username(self, username: str) -> Optional[UserInDB]:
        user = await self.collection.find_one({"username": username})
        if user:
            return UserInDB(**user)
        return None

    async def get_multi(self, skip: int = 0, limit: int = 100) -> List[UserInDB]:
        users = await self.collection.find().skip(skip).limit(limit).to_list(length=limit)
        return [UserInDB(**user) for user in users]

    async def create(self, user_in: UserCreate) -> UserInDB:
        hashed_password = get_password_hash(user_in.password)
        user_dict = user_in.dict(exclude={"password"})
        user_dict["hashed_password"] = hashed_password
        result = await self.collection.insert_one(user_dict)
        user_dict["_id"] = result.inserted_id
        return UserInDB(**user_dict)

    async def update(self, user_id: str, user_in: UserUpdate) -> Optional[UserInDB]:
        user_dict = user_in.dict(exclude_unset=True)
        if user_dict.get("password"):
            user_dict["hashed_password"] = get_password_hash(user_dict.pop("password"))
        result = await self.collection.update_one(
            {"_id": ObjectId(user_id)},
            {"$set": user_dict}
        )
        if result.modified_count:
            return await self.get_by_id(user_id)
        return None

    async def delete(self, user_id: str) -> bool:
        result = await self.collection.delete_one({"_id": ObjectId(user_id)})
        return result.deleted_count > 0

    async def authenticate(self, username: str, password: str) -> Optional[UserInDB]:
        user = await self.get_by_username(username)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    # Профили пользователей
    async def get_profile(self, user_id: str) -> Optional[UserProfile]:
        profile = await self.profiles_collection.find_one({"user_id": ObjectId(user_id)})
        if profile:
            return UserProfile(**profile)
        return None

    async def create_profile(self, user_id: str, profile_in: UserProfileCreate) -> UserProfile:
        profile_dict = profile_in.dict()
        profile_dict["user_id"] = ObjectId(user_id)
        result = await self.profiles_collection.insert_one(profile_dict)
        profile_dict["_id"] = result.inserted_id
        return UserProfile(**profile_dict)

    async def update_profile(self, user_id: str, profile_in: UserProfileUpdate) -> Optional[UserProfile]:
        profile_dict = profile_in.dict(exclude_unset=True)
        result = await self.profiles_collection.update_one(
            {"user_id": ObjectId(user_id)},
            {"$set": profile_dict}
        )
        if result.modified_count:
            return await self.get_profile(user_id)
        return None

    # Роли пользователей
    async def get_role(self, role_id: str) -> Optional[dict]:
        return await self.roles_collection.find_one({"_id": ObjectId(role_id)})

    async def create_role(self, role_in: UserRoleCreate) -> dict:
        role_dict = role_in.dict()
        result = await self.roles_collection.insert_one(role_dict)
        role_dict["_id"] = result.inserted_id
        return role_dict

    async def update_role(self, role_id: str, role_in: UserRoleUpdate) -> Optional[dict]:
        role_dict = role_in.dict(exclude_unset=True)
        result = await self.roles_collection.update_one(
            {"_id": ObjectId(role_id)},
            {"$set": role_dict}
        )
        if result.modified_count:
            return await self.get_role(role_id)
        return None

    async def delete_role(self, role_id: str) -> bool:
        result = await self.roles_collection.delete_one({"_id": ObjectId(role_id)})
        return result.deleted_count > 0

# Создаем экземпляр класса для использования в других модулях
user_crud = UserCRUD(MongoDB())