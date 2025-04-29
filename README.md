# КПиУС (Система контроля посещаемости и успеваемости студентов)

Демонстрационная версия системы контроля посещаемости и успеваемости студентов для ДВФУ. Проект реализован с использованием современных технологий веб-разработки, в том числе React с TypeScript, FastAPI и MongoDB.

## Структура проекта

Проект разделен на два основных компонента:

- `client` - фронтенд приложения на React с TypeScript и Material UI в стиле Vision OS
- `fastapi-server` - бэкенд API на FastAPI и MongoDB

## Быстрый старт

### Предварительные требования

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Запуск проекта

```bash
# Запуск в режиме разработки
./start.sh dev  # Linux/macOS
start.bat dev   # Windows (Batch)
.\start.ps1 dev # Windows (PowerShell)

# Запуск в режиме продакшена
./start.sh prod
```

После запуска:
- В режиме разработки: http://localhost:3000
- В режиме продакшена: http://localhost

## Документация

- [Архитектура](docs/ARCHITECTURE.md) - описание микросервисной архитектуры
- [Развертывание](docs/DEPLOYMENT.md) - инструкции по развертыванию
- [Тестирование](docs/TESTING.md) - руководство по тестированию
- [Разработка](docs/DEVELOPMENT.md) - руководство по разработке

## Демонстрационные учетные записи

1. **Студент**
   - Email: student@example.com
   - Пароль: password123

2. **Преподаватель**
   - Email: teacher@example.com
   - Пароль: password123

3. **Администратор**
   - Email: admin@example.com
   - Пароль: password123

## Технологии

### Клиентская часть
- React 19
- TypeScript
- Material UI 7
- React Router
- Axios

### Серверная часть
- Python FastAPI
- MongoDB с Motor
- JWT для аутентификации
- Passlib для шифрования паролей
- Uvicorn в качестве ASGI-сервера

### Инфраструктура
- Docker
- Docker Compose
- Nginx

## Функциональность

### Для студентов
- Просмотр расписания занятий
- Отслеживание посещаемости
- Просмотр оценок по предметам

### Для преподавателей
- Отметка посещаемости студентов
- Выставление оценок
- Управление дисциплинами и группами

### Для администраторов
- Управление пользователями
- Просмотр аналитики и статистики
- Управление системными настройками

## Тестирование

Проект использует систему тестирования на основе Docker, которая позволяет запускать тесты как для всего приложения, так и для отдельных микросервисов.

### Предварительные требования

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)

### Запуск тестов

#### Запуск всех тестов
```bash
docker-compose -f tests/docker-compose.test.yml up --build
```

#### Запуск тестов конкретного сервиса
```bash
# Тесты auth-service
docker-compose -f tests/docker-compose.test.yml up --build auth-service-tests

# Тесты attendance-service
docker-compose -f tests/docker-compose.test.yml up --build attendance-service-tests

# Тесты notification-service
docker-compose -f tests/docker-compose.test.yml up --build notification-service-tests

# Тесты reporting-service
docker-compose -f tests/docker-compose.test.yml up --build reporting-service-tests

# Тесты task-service
docker-compose -f tests/docker-compose.test.yml up --build task-service-tests

# Тесты user-service
docker-compose -f tests/docker-compose.test.yml up --build user-service-tests
```

### Структура тестов

Тесты организованы следующим образом:

```
tests/
├── base/                    # Базовые тестовые утилиты и зависимости
│   ├── Dockerfile          # Базовый Dockerfile для тестов
│   ├── requirements-test.txt # Зависимости для тестирования
│   └── conftest.py         # Общие фикстуры pytest
├── auth-service/           # Тесты сервиса аутентификации
├── attendance-service/     # Тесты сервиса посещаемости
├── notification-service/   # Тесты сервиса уведомлений
├── reporting-service/      # Тесты сервиса отчетов
├── task-service/          # Тесты сервиса задач
└── user-service/          # Тесты сервиса пользователей
```

### Особенности тестирования

1. **Изоляция тестов:**
   - Каждый сервис тестируется в отдельном контейнере
   - Используется отдельная тестовая база данных
   - Тесты не влияют друг на друга

2. **Параллельное выполнение:**
   - Тесты разных сервисов могут выполняться параллельно
   - Используется pytest-xdist для параллельного выполнения тестов внутри сервиса

3. **Покрытие кода:**
   - Генерируются отчеты о покрытии кода тестами
   - Отчеты сохраняются в формате XML для интеграции с CI/CD

4. **Интеграция с CI/CD:**
   - Тесты автоматически запускаются при пуше в репозиторий
   - Проверяется покрытие кода тестами
   - Генерируются отчеты о результатах тестирования

### Ручное тестирование без Docker

Для запуска тестов без Docker (например, при локальной разработке):

```bash
# Установка зависимостей для тестирования
pip install -r tests/base/requirements-test.txt

# Запуск тестов конкретного сервиса
cd services/auth-service
pytest ../tests/auth-service/ --cov=app --cov-report=xml

# Запуск всех тестов
pytest tests/ --cov=app --cov-report=xml
```

### Демонстрационные данные для тестов

Для тестирования используются специальные демонстрационные данные:

1. **Тестовые пользователи:**
   - Email: test@example.com
   - Пароль: test_password

2. **Тестовая база данных:**
   - Название: test_kpiusdb
   - URL: mongodb://localhost:27017 

## Развертывание приложения

### Микросервисная архитектура

Проект построен на микросервисной архитектуре и состоит из следующих сервисов:

1. **API Gateway** (`services/api-gateway`)
   - Маршрутизация запросов
   - Аутентификация и авторизация
   - Балансировка нагрузки

2. **Auth Service** (`services/auth-service`)
   - Управление пользователями
   - Аутентификация
   - JWT токены

3. **User Service** (`services/user-service`)
   - Управление профилями пользователей
   - Роли и права доступа
   - Группы и подразделения

4. **Attendance Service** (`services/attendance-service`)
   - Учет посещаемости
   - Расписание занятий
   - Статистика посещаемости

5. **Task Service** (`services/task_service`)
   - Управление заданиями
   - Дедлайны
   - Прогресс выполнения

6. **Notification Service** (`services/notification-service`)
   - Уведомления
   - Почтовые рассылки
   - Push-уведомления

7. **Reporting Service** (`services/reporting-service`)
   - Генерация отчетов
   - Аналитика
   - Экспорт данных

### Развертывание с Docker

#### Развертывание в режиме разработки

```bash
# Запуск всех сервисов
docker-compose up --build

# Запуск конкретного сервиса
docker-compose up --build auth-service
docker-compose up --build attendance-service
# и т.д.
```

#### Развертывание в продакшене

```bash
# Сборка и запуск в продакшен режиме
docker-compose -f docker-compose.prod.yml up --build -d

# Масштабирование сервисов
docker-compose -f docker-compose.prod.yml up --build -d --scale auth-service=3
docker-compose -f docker-compose.prod.yml up --build -d --scale attendance-service=2
```

### Конфигурация сервисов

Каждый сервис имеет свой файл конфигурации `.env`:

```env
# Общие настройки
MONGODB_URL=mongodb://mongodb:27017
DATABASE_NAME=kpiusdb

# Настройки JWT
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Настройки сервиса
SERVICE_PORT=8000
SERVICE_NAME=auth-service
```

### Мониторинг и логирование

1. **Prometheus + Grafana**
   - Мониторинг метрик
   - Визуализация данных
   - Оповещения

2. **ELK Stack**
   - Централизованное логирование
   - Анализ логов
   - Поиск по логам

### Масштабирование

1. **Горизонтальное масштабирование**
   ```bash
   # Масштабирование auth-service
   docker-compose up --build -d --scale auth-service=3
   
   # Масштабирование attendance-service
   docker-compose up --build -d --scale attendance-service=2
   ```

2. **Вертикальное масштабирование**
   ```yaml
   # В docker-compose.yml
   services:
     auth-service:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```

### Резервное копирование

1. **База данных**
   ```bash
   # Создание бэкапа
   docker-compose exec mongodb mongodump --out /backup

   # Восстановление из бэкапа
   docker-compose exec mongodb mongorestore /backup
   ```

2. **Конфигурация**
   - Хранение конфигурации в Git
   - Использование секретов Docker
   - Ротация ключей 