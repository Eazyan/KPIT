# Микросервисная система контроля посещаемости

Проект представляет собой микросервисную архитектуру для системы контроля посещаемости студентов. Проект реализован с использованием FastAPI для бэкенда и React для фронтенда.

## Архитектура системы

Система состоит из следующих компонентов:

1. **Auth Service** - сервис аутентификации и авторизации
2. **Attendance Service** - сервис учёта посещаемости
3. **API Gateway** - API-шлюз для маршрутизации запросов между клиентом и сервисами
4. **Client** - клиентское приложение на React

## Технологии

### Бэкенд
- FastAPI
- MongoDB
- JWT для аутентификации
- Docker & Docker Compose

### Фронтенд
- React
- TypeScript
- Material UI
- Axios для HTTP-запросов

## Запуск проекта

### Предварительные требования
- Docker и Docker Compose
- Node.js 16+
- Python 3.9+

### Запуск с использованием Docker Compose

1. Клонируйте репозиторий:
```
git clone <repository-url>
cd kpius-microservices
```

2. Запустите все сервисы с помощью Docker Compose:
```
docker-compose up -d
```

3. Проверьте, что все сервисы запущены:
```
docker-compose ps
```

4. Откройте приложение в браузере:
```
http://localhost:3000
```

### Локальный запуск для разработки

#### Auth Service
```
cd auth-service
pip install -r requirements.txt
python main.py
```

#### API Gateway
```
cd api-gateway
pip install -r requirements.txt
python main.py
```

#### Attendance Service
```
cd attendance-service
pip install -r requirements.txt
python main.py
```

#### Client
```
cd client
npm install
npm start
```

## API Endpoints

### Auth Service (http://localhost:5001/api)
- `POST /auth/login` - Вход в систему
- `POST /auth/register` - Регистрация нового пользователя
- `POST /auth/login/oauth` - OAuth авторизация (для Swagger UI)
- `GET /auth/user` - Получение информации о текущем пользователе
- `GET /auth/validate` - Валидация токена

### API Gateway (http://localhost:6000/api)
- Проксирует запросы к сервисам

## Разработчики

- Ваше имя

## Лицензия

MIT 