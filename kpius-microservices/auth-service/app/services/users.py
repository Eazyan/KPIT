from datetime import datetime
from typing import List, Optional
from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from app.core.database import get_database
from app.core.security import get_password_hash
from app.models.user import UserCreate, UserInDB, UserUpdate


async def get_user_by_email(email: str) -> Optional[UserInDB]:
    """
    Получение пользователя по email
    """
    db = await get_database()
    user_dict = await db.users.find_one({"email": email})
    if user_dict:
        return UserInDB(**user_dict)
    return None


async def get_user_by_id(user_id: str) -> Optional[UserInDB]:
    """
    Получение пользователя по ID
    """
    if not ObjectId.is_valid(user_id):
        return None
    
    db = await get_database()
    user_dict = await db.users.find_one({"_id": ObjectId(user_id)})
    if user_dict:
        return UserInDB(**user_dict)
    return None


async def create_user(user_data: UserCreate) -> Optional[UserInDB]:
    """
    Создание нового пользователя
    """
    # Проверяем, что пользователь с таким email не существует
    existing_user = await get_user_by_email(user_data.email)
    if existing_user:
        return None
    
    # Создаем документ пользователя
    user_dict = user_data.dict(exclude={"password"})
    user_dict["hashed_password"] = get_password_hash(user_data.password)
    user_dict["created_at"] = datetime.utcnow()
    user_dict["updated_at"] = user_dict["created_at"]
    
    try:
        # Добавляем в базу данных
        db = await get_database()
        insert_result = await db.users.insert_one(user_dict)
        
        # Получаем созданного пользователя
        user_dict["_id"] = insert_result.inserted_id
        return UserInDB(**user_dict)
    except DuplicateKeyError:
        # Если возникла ошибка дубликата ключа (например, email)
        return None


async def update_user(user_id: str, user_data: UserUpdate) -> Optional[UserInDB]:
    """
    Обновление данных пользователя
    """
    if not ObjectId.is_valid(user_id):
        return None
    
    # Получаем текущего пользователя
    current_user = await get_user_by_id(user_id)
    if not current_user:
        return None
    
    # Подготавливаем данные для обновления
    update_data = user_data.dict(exclude_unset=True)
    
    # Если передан новый пароль, хешируем его
    if "password" in update_data and update_data["password"]:
        update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
    
    # Добавляем время обновления
    update_data["updated_at"] = datetime.utcnow()
    
    # Обновляем документ в базе данных
    db = await get_database()
    await db.users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_data}
    )
    
    # Возвращаем обновленного пользователя
    return await get_user_by_id(user_id)


async def delete_user(user_id: str) -> bool:
    """
    Удаление пользователя
    """
    if not ObjectId.is_valid(user_id):
        return False
    
    db = await get_database()
    result = await db.users.delete_one({"_id": ObjectId(user_id)})
    return result.deleted_count > 0


async def get_users(skip: int = 0, limit: int = 100) -> List[UserInDB]:
    """
    Получение списка пользователей с пагинацией
    """
    db = await get_database()
    cursor = db.users.find().skip(skip).limit(limit)
    users = await cursor.to_list(length=limit)
    return [UserInDB(**user) for user in users] 