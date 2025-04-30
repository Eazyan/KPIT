from datetime import timedelta
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from motor.motor_asyncio import AsyncIOMotorDatabase
from app.core import security
from app.core.config import get_settings
# Временно закомментировано для решения циклической зависимости
# from app.core.deps import get_current_active_user
from app.crud.user import get_user_by_email
from app.models.user import User, UserInDB
from app.schemas.token import Token
from app.db.mongodb import MongoDB
from app.core.security import create_access_token, verify_password

router = APIRouter()
settings = get_settings()

@router.post("/login", response_model=Token)
async def login(
    form_data: Dict = Body(...),
    db: AsyncIOMotorDatabase = Depends(MongoDB.get_db)
) -> Any:
    """
    Login endpoint to get an access token
    """
    print(f"Auth service received login request at /api/v1/auth/login - form_data: {form_data}")
    
    email = form_data.get("email")
    password = form_data.get("password")
    
    print(f"Login attempt for email: {email}")
    
    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required",
        )
    
    try:
        # Получаем пользователя из базы данных
        db_user = await db["users"].find_one({"email": email})
        if not db_user:
            print(f"User not found with email: {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # Преобразуем ObjectId в строку для совместимости с Pydantic
        db_user["_id"] = str(db_user["_id"])
        
        # Создаем объект UserInDB
        user = UserInDB(**db_user)
        
        if not verify_password(password, user.hashed_password):
            print(f"Invalid password for user: {email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        print(f"Successful login for user: {email}")
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user.email}, expires_delta=access_token_expires
        )
        
        # Создаем стандартный ответ для Token
        token_response = {
            "access_token": access_token,
            "token_type": "bearer"
        }
        
        # Добавляем информацию о пользователе для фронтенда
        token_response.update({
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.full_name,
                "role": getattr(user, "role", "student") or "student"
            }
        })
        
        print(f"Token response: {token_response}")
        return token_response
    except Exception as e:
        print(f"Error during login: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login error: {str(e)}"
        )

# Эндпоинт для регистрации пользователя
@router.post("/register", response_model=User)
async def register(
    user_data: Dict = Body(...),
    db: AsyncIOMotorDatabase = Depends(MongoDB.get_db)
) -> Any:
    """
    Register a new user
    """
    email = user_data.get("email")
    password = user_data.get("password")
    full_name = user_data.get("full_name", "")
    
    if not email or not password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email and password are required",
        )
    
    existing_user = await get_user_by_email(db, email=email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    from app.crud.user import create_user_mongo
    from app.models.user import UserCreate
    
    user_in = UserCreate(
        email=email,
        password=password,
        full_name=full_name,
        is_active=True,
        is_superuser=False
    )
    
    user = await create_user_mongo(db, user_in)
    return user

# Временно закомментировано для решения циклической зависимости
'''
@router.post("/login/test-token", response_model=User)
async def test_token(current_user: User = Depends(get_current_active_user)) -> Any:
    """
    Test access token
    """
    return current_user
''' 