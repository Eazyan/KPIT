from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles
import os
from dotenv import load_dotenv

from .api.routes import auth

# Загрузка переменных окружения
load_dotenv()

# Создание экземпляра FastAPI с метаданными
app = FastAPI(
    title="КПиУС API",
    description="""
    API для системы контроля посещаемости и успеваемости студентов.
    
    ### Основные функции:
    
    * **Аутентификация и авторизация** - регистрация, вход и управление пользователями
    * **Управление группами** - создание, просмотр и редактирование учебных групп
    * **Управление дисциплинами** - добавление учебных предметов и назначение преподавателей
    * **Учет посещаемости** - фиксирование присутствия/отсутствия студентов на занятиях
    * **Учет успеваемости** - выставление и мониторинг оценок по дисциплинам
    """,
    version="1.0.0",
    docs_url=None,  # Отключаем стандартный путь к документации
    redoc_url="/api/docs/redoc",
)

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # В продакшене следует указать конкретные домены
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение маршрутов
app.include_router(auth.router, prefix="/api/auth", tags=["Аутентификация"])

# Пользовательский путь к API документации
@app.get("/api/docs", include_in_schema=False)
async def custom_swagger_ui_html():
    return get_swagger_ui_html(
        openapi_url="/openapi.json",
        title="КПиУС API - Документация",
        swagger_js_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui-bundle.js",
        swagger_css_url="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.9.0/swagger-ui.css",
    )

@app.get("/", tags=["Основное"])
async def root():
    """
    Проверка работоспособности API сервера
    """
    return {"message": "API сервера КПиУС работает!", "version": "1.0.0"} 