from datetime import datetime, timedelta
from typing import Optional
from bson import ObjectId
from jose import jwt
from passlib.context import CryptContext

from app.core.config import get_settings
from app.models.user import User, UserInDB
from app.schemas.auth import UserCreate
from app.db.mongodb import get_database

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    """
    Сервис аутентификации - реализация паттерна MCP (Model-Controller-Provider)
    """
    
    async def get_user_by_email(self, email: str) -> Optional[UserInDB]:
        """
        Получение пользователя по email
        """
        db = await get_database()
        user_data = await db.users.find_one({"email": email})
        if user_data:
            return UserInDB(**user_data)
        return None
    
    async def get_user_by_id(self, user_id: str) -> Optional[UserInDB]:
        """
        Получение пользователя по ID
        """
        db = await get_database()
        user_data = await db.users.find_one({"_id": ObjectId(user_id)})
        if user_data:
            return UserInDB(**user_data)
        return None
    
    async def authenticate_user(self, email: str, password: str) -> Optional[UserInDB]:
        """
        Аутентификация пользователя по email и паролю
        """
        user = await self.get_user_by_email(email)
        if not user:
            return None
        if not self.verify_password(password, user.hashed_password):
            return None
        return user
    
    async def create_user(self, user_data: UserCreate) -> UserInDB:
        """
        Создание нового пользователя
        """
        db = await get_database()
        
        # Хешируем пароль
        hashed_password = self.get_password_hash(user_data.password)
        
        # Создаем документ пользователя
        user_dict = user_data.dict()
        user_dict.pop("password")  # Удаляем нехешированный пароль
        user_dict["hashed_password"] = hashed_password
        user_dict["created_at"] = datetime.utcnow()
        user_dict["updated_at"] = datetime.utcnow()
        
        # Добавляем пользователя в базу данных
        result = await db.users.insert_one(user_dict)
        user_dict["_id"] = result.inserted_id
        
        return UserInDB(**user_dict)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """
        Проверка пароля
        """
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        """
        Хеширование пароля
        """
        return pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """
        Создание JWT токена
        """
        to_encode = data.copy()
        
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
            
        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.ALGORITHM)
        
        return encoded_jwt 