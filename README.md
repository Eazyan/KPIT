# Система контроля посещаемости (КПиУС)

## Архитектура

Проект построен на основе микросервисной архитектуры и состоит из следующих сервисов:

1. **API Gateway** (порт 8000)
   - Единая точка входа для всех запросов
   - Маршрутизация запросов к соответствующим сервисам
   - Аутентификация и авторизация

2. **Auth Service** (порт 8001)
   - Управление аутентификацией и авторизацией
   - Регистрация и вход пользователей
   - Управление JWT токенами

3. **User Service** (порт 8002)
   - Управление профилями пользователей
   - Хранение информации о пользователях
   - Управление ролями и правами

4. **Attendance Service** (порт 8003)
   - Учет посещаемости
   - Регистрация входов/выходов
   - Статистика посещаемости

5. **Notification Service** (порт 8004)
   - Управление уведомлениями
   - Отправка уведомлений через RabbitMQ
   - Шаблоны уведомлений

6. **Reporting Service** (порт 8005)
   - Генерация отчетов
   - Экспорт данных
   - Шаблоны отчетов

## Технологии

- **Backend**: FastAPI, Python 3.11
- **Frontend**: React
- **База данных**: MongoDB
- **Message Broker**: RabbitMQ
- **Контейнеризация**: Docker, Docker Compose

## Требования

- Docker
- Docker Compose
- Node.js (для разработки)
- Python 3.11 (для разработки)

## Настройка окружения

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd kpius
```

2. Создайте файл .env в корневой директории проекта:
```bash
# MongoDB
MONGODB_URL=mongodb://mongodb:27017
DATABASE_NAME=kpiusdb

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672/

# JWT
JWT_SECRET=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Service URLs
AUTH_SERVICE_URL=http://auth-service:8001
USER_SERVICE_URL=http://user-service:8002
ATTENDANCE_SERVICE_URL=http://attendance-service:8003
NOTIFICATION_SERVICE_URL=http://notification-service:8004
REPORTING_SERVICE_URL=http://reporting-service:8005

# Client
REACT_APP_API_URL=http://localhost:8000
```

3. Запустите проект:
```bash
docker-compose up -d
```

## Разработка

### Запуск в режиме разработки

```bash
docker-compose -f docker-compose.dev.yml up -d
```

### Структура проекта

```
kpius/
├── services/
│   ├── api-gateway/
│   ├── auth-service/
│   ├── user-service/
│   ├── attendance-service/
│   ├── notification-service/
│   └── reporting-service/
├── client/
├── docker-compose.yml
├── docker-compose.dev.yml
└── README.md
```

### API Endpoints

#### API Gateway (http://localhost:8000)

- `POST /auth/token` - Получение JWT токена
- `POST /auth/register` - Регистрация нового пользователя
- `GET /users/{username}` - Получение информации о пользователе
- `PUT /users/{username}` - Обновление информации о пользователе
- `POST /attendance` - Регистрация посещаемости
- `GET /attendance/{user_id}` - Получение истории посещаемости
- `GET /notifications/{user_id}` - Получение уведомлений
- `PUT /notifications/{notification_id}/read` - Отметка уведомления как прочитанного
- `POST /reports/generate` - Генерация отчета
- `GET /reports/templates` - Получение шаблонов отчетов

## Тестирование

```bash
# Запуск тестов для всех сервисов
docker-compose run --rm api-gateway pytest
docker-compose run --rm auth-service pytest
docker-compose run --rm user-service pytest
docker-compose run --rm attendance-service pytest
docker-compose run --rm notification-service pytest
docker-compose run --rm reporting-service pytest
```

## Мониторинг

- RabbitMQ Management UI: http://localhost:15672
- MongoDB Express: http://localhost:8081
- API Gateway Swagger UI: http://localhost:8000/docs

## Безопасность

- Все сервисы используют JWT для аутентификации
- Пароли хешируются с использованием bcrypt
- Все чувствительные данные хранятся в переменных окружения
- CORS настроен для безопасного взаимодействия между сервисами

## Масштабирование

Каждый сервис может быть масштабирован независимо:

```bash
docker-compose up -d --scale auth-service=3
docker-compose up -d --scale user-service=2
```

## Логирование

Логи каждого сервиса доступны через Docker:

```bash
docker-compose logs -f [service-name]
```

## Обновление

```bash
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
``` 