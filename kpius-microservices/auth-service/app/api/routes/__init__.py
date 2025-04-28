from fastapi import APIRouter
from .auth import router as auth_router

router = APIRouter()

# Подключаем маршруты аутентификации
router.include_router(auth_router, prefix="/auth", tags=["auth"])
