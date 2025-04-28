from fastapi import APIRouter
from .routes import router as routes_router

router = APIRouter()

# Подключаем маршруты API
router.include_router(routes_router)

# Инициализация API модуля
