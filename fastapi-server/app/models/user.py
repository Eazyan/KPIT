from enum import Enum
from typing import Optional, Any, Annotated, List
from pydantic import BaseModel, Field, EmailStr, BeforeValidator, field_validator, model_validator
from datetime import datetime
from bson import ObjectId


# Валидатор для ObjectId
def validate_object_id(value: Any) -> str:
    """
    Валидатор для ObjectId - проверяет, что строка является валидным ObjectId MongoDB
    
    Args:
        value: Значение для проверки
        
    Returns:
        str: Строковое представление ObjectId
        
    Raises:
        ValueError: Если значение не является валидным ObjectId
    """
    if not ObjectId.is_valid(value):
        raise ValueError("Недопустимый формат ObjectId")
    return str(value)


PyObjectId = Annotated[str, BeforeValidator(validate_object_id)]


class UserRole(str, Enum):
    """Роли пользователей в системе"""
    STUDENT = "student"
    TEACHER = "teacher"
    ADMIN = "admin"
    HEAD_OF_DEPARTMENT = "head_of_department"
    
    @classmethod
    def get_student_roles(cls) -> List["UserRole"]:
        """Получение списка ролей для студентов"""
        return [cls.STUDENT]
    
    @classmethod
    def get_teacher_roles(cls) -> List["UserRole"]:
        """Получение списка ролей для преподавателей"""
        return [cls.TEACHER, cls.HEAD_OF_DEPARTMENT]
    
    @classmethod
    def get_admin_roles(cls) -> List["UserRole"]:
        """Получение списка ролей для администраторов"""
        return [cls.ADMIN]


class UserBase(BaseModel):
    """Базовая модель данных пользователя"""
    name: str = Field(..., min_length=2, max_length=100, description="Имя пользователя")
    email: EmailStr = Field(..., description="Email пользователя (уникальный)")
    role: UserRole = Field(default=UserRole.STUDENT, description="Роль пользователя в системе")
    group: Optional[str] = Field(None, description="Группа (для студентов)")
    department: Optional[str] = Field(None, description="Кафедра (для преподавателей)")
    
    @model_validator(mode='after')
    def validate_role_specific_fields(self) -> "UserBase":
        """
        Проверяет наличие полей, необходимых для конкретной роли пользователя
        """
        if self.role == UserRole.STUDENT and not self.group:
            raise ValueError("Поле 'group' обязательно для студентов")
        
        if self.role in [UserRole.TEACHER, UserRole.HEAD_OF_DEPARTMENT] and not self.department:
            raise ValueError("Поле 'department' обязательно для преподавателей")
            
        return self


class UserCreate(UserBase):
    """Модель для создания нового пользователя"""
    password: str = Field(..., min_length=8, max_length=100, description="Пароль пользователя")


class UserInDB(UserBase):
    """Модель пользователя в базе данных"""
    id: PyObjectId = Field(alias="_id", description="MongoDB ObjectId пользователя")
    password_hash: str = Field(..., description="Хешированный пароль")
    created_at: datetime = Field(default_factory=datetime.now, description="Дата создания аккаунта")
    updated_at: datetime = Field(default_factory=datetime.now, description="Дата последнего обновления")
    
    model_config = {
        "populate_by_name": True,
        "arbitrary_types_allowed": True,
        "json_encoders": {ObjectId: str}
    }


class User(UserBase):
    """Модель пользователя для API ответов"""
    id: str = Field(..., description="Идентификатор пользователя")
    created_at: Optional[datetime] = Field(None, description="Дата создания аккаунта")
    updated_at: Optional[datetime] = Field(None, description="Дата последнего обновления")
    
    model_config = {
        "populate_by_name": True,
        "from_attributes": True,
        "json_schema_extra": {
            "example": {
                "_id": "507f1f77bcf86cd799439011",
                "name": "Иван Иванов",
                "email": "ivan@example.com",
                "role": "student",
                "group": "ИВТ-101",
                "department": None,
                "created_at": "2023-01-01T00:00:00",
                "updated_at": "2023-01-01T00:00:00"
            }
        }
    }


class UserUpdate(BaseModel):
    """Модель для обновления данных пользователя"""
    name: Optional[str] = Field(None, min_length=2, max_length=100, description="Имя пользователя")
    email: Optional[EmailStr] = Field(None, description="Email пользователя")
    password: Optional[str] = Field(None, min_length=8, max_length=100, description="Новый пароль пользователя")
    role: Optional[UserRole] = Field(None, description="Роль пользователя в системе")
    group: Optional[str] = Field(None, description="Группа (для студентов)")
    department: Optional[str] = Field(None, description="Кафедра (для преподавателей)")


class Token(BaseModel):
    """Модель токена JWT"""
    access_token: str = Field(..., description="JWT токен доступа")
    token_type: str = Field("bearer", description="Тип токена")


class TokenData(BaseModel):
    """Модель данных, хранящихся в JWT токене"""
    id: Optional[str] = Field(None, description="Идентификатор пользователя")
    role: Optional[UserRole] = Field(None, description="Роль пользователя") 