# КПиУС Backend (FastAPI)

Бэкенд для системы контроля посещаемости и успеваемости студентов, разработанный на FastAPI с MongoDB.

## Возможности системы

- **Аутентификация и авторизация**
  - Регистрация пользователей разных ролей (студент, преподаватель, заведующий кафедрой, администратор)
  - Вход пользователей с получением JWT токена
  - Проверка ролей и прав доступа
  - Защита маршрутов API

- **Управление учебными группами**
  - Создание и редактирование групп
  - Просмотр списка групп
  - Назначение студентов в группы

- **Управление дисциплинами**
  - Создание и редактирование учебных дисциплин
  - Назначение преподавателей на дисциплины
  - Привязка дисциплин к группам

- **Учет посещаемости и успеваемости**
  - Фиксация присутствия/отсутствия студентов
  - Выставление оценок
  - Формирование отчетов

## Технологии

- **FastAPI** - современный, быстрый фреймворк для создания API
- **Pydantic** - валидация данных и сериализация
- **MongoDB** - NoSQL база данных для хранения информации
- **PyMongo** - драйвер MongoDB для Python
- **JWT** - токены для аутентификации и авторизации
- **Uvicorn** - ASGI-сервер для запуска FastAPI приложений

## Требования

- Python 3.8 или выше
- MongoDB 4.4 или выше
- Все зависимости из requirements.txt

## Установка и настройка

1. Клонируйте репозиторий:
   ```
   git clone https://github.com/yourusername/kpius.git
   cd kpius/fastapi-server
   ```

2. Создайте и активируйте виртуальное окружение:
   ```
   python -m venv venv
   source venv/bin/activate  # для Linux/macOS
   venv\Scripts\activate     # для Windows
   ```

3. Установите зависимости:
   ```
   pip install -r requirements.txt
   ```

4. Настройте параметры в файле `.env`:
   ```
   MONGODB_URL=mongodb://localhost:27017
   DATABASE_NAME=kpiusdb
   JWT_SECRET=your-secure-secret-key
   ACCESS_TOKEN_EXPIRE_MINUTES=30
   ALGORITHM=HS256
   ```

5. Заполните базу данных тестовыми данными (опционально):
   ```
   python seed_data.py
   ```

## Запуск сервера

Для запуска сервера в режиме разработки:

```
python run.py
```

Сервер будет доступен по адресу http://localhost:5005

## API Endpoints

### Аутентификация

- `POST /api/auth/login` - Вход пользователя
- `POST /api/auth/register` - Регистрация нового пользователя
- `GET /api/auth/profile` - Получение профиля текущего пользователя

### Документация API

- `GET /api/docs` - Интерактивная Swagger-документация API
- `GET /api/docs/redoc` - Документация в формате ReDoc

## Структура проекта

```
fastapi-server/
├── app/
│   ├── api/
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   └── auth.py
│   │   └── __init__.py
│   ├── core/
│   │   ├── __init__.py
│   │   ├── database.py
│   │   └── security.py
│   ├── middlewares/
│   │   ├── __init__.py
│   │   └── auth.py
│   ├── models/
│   │   ├── __init__.py
│   │   └── user.py
│   ├── __init__.py
│   └── main.py
├── venv/
├── .env
├── .gitignore
├── README.md
├── requirements.txt
├── run.py
└── seed_data.py
```

## Разработка

### Добавление новых маршрутов

1. Создайте новый файл в директории `app/api/routes/` для группы маршрутов
2. Импортируйте необходимые зависимости и создайте экземпляр Router
3. Реализуйте нужные API endpoints
4. Зарегистрируйте маршруты в `app/main.py`

### Аутентификация и авторизация

Для защиты маршрутов используйте middleware:

```python
from ...middlewares.auth import get_current_active_user, check_roles
from ...models.user import UserRole

@router.get("/protected")
async def protected_route(current_user = Depends(get_current_active_user)):
    return {"message": "Доступ разрешен"}

@router.get("/admin-only")
async def admin_route(current_user = Depends(check_roles([UserRole.ADMIN]))):
    return {"message": "Доступ только для администратора"}
```

## Лицензия

MIT 