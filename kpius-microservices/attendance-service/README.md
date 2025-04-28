# Сервис посещаемости (Attendance Service)

Микросервис для управления посещаемостью в системе KPIUS.

## Функциональность

- Управление группами и студентами
- Учет и контроль посещаемости
- Генерация статистики и отчетов по посещаемости
- Интеграция с сервисом аутентификации

## Технический стек

- **Язык:** Python 3.9
- **Фреймворк:** FastAPI
- **База данных:** MongoDB
- **Контейнеризация:** Docker

## Запуск сервиса

### Локальный запуск

```bash
# Установка зависимостей
pip install -r requirements.txt

# Запуск сервиса
python main.py
```

### Запуск через Docker

```bash
# Сборка образа
docker build -t attendance-service .

# Запуск контейнера
docker run -p 5001:5001 attendance-service
```

### Запуск через docker-compose

```bash
# Из корня проекта
docker-compose up -d attendance-service
```

## API Endpoints

### Группы

- `POST /api/groups/` - Создание новой группы
- `GET /api/groups/` - Получение списка групп
- `GET /api/groups/{group_id}` - Получение группы по ID
- `PUT /api/groups/{group_id}` - Обновление данных группы
- `DELETE /api/groups/{group_id}` - Удаление группы

### Студенты

- `POST /api/students/` - Добавление студента
- `GET /api/students/` - Получение списка студентов
- `GET /api/students/{student_id}` - Получение студента по ID
- `PUT /api/students/{student_id}` - Обновление данных студента
- `DELETE /api/students/{student_id}` - Удаление студента

### Посещаемость

- `POST /api/attendance/` - Регистрация посещения
- `GET /api/attendance/` - Получение списка посещений
- `GET /api/attendance/group/{group_id}` - Получение посещений по группе
- `GET /api/attendance/student/{student_id}` - Получение посещений по студенту
- `GET /api/attendance/stats` - Получение статистики посещаемости 