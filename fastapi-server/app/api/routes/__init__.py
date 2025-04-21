# Инициализация пакета routes 
from fastapi import APIRouter

# Закомментируем отсутствующие модули
# from .users import router as users_router
# from .groups import router as groups_router 
# from .disciplines import router as disciplines_router
from .auth import router as auth_router
from .attendance import router as attendance_router
from .grades import router as grades_router

api_router = APIRouter(prefix="/api")

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
# api_router.include_router(users_router, prefix="/users", tags=["users"])
# api_router.include_router(groups_router, prefix="/groups", tags=["groups"])
# api_router.include_router(disciplines_router, prefix="/disciplines", tags=["disciplines"])
api_router.include_router(attendance_router, prefix="/attendance", tags=["attendance"])
api_router.include_router(grades_router, prefix="/grades", tags=["grades"]) 