# Тестирование КПиУС

## Предварительные требования

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Python 3.8+](https://www.python.org/downloads/)
- [pip](https://pip.pypa.io/en/stable/installation/)

## Запуск тестов

### Запуск всех тестов
```bash
# С использованием Docker
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit

# Без Docker
pytest tests/
```

### Запуск тестов конкретного сервиса
```bash
# С использованием Docker
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit auth-service

# Без Docker
pytest tests/auth_service/
```

### Запуск с покрытием кода
```bash
# С использованием Docker
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit --coverage

# Без Docker
pytest --cov=services tests/
```

## Структура тестов

```
tests/
├── base/
│   ├── conftest.py
│   ├── Dockerfile
│   └── requirements-test.txt
├── auth_service/
│   ├── test_auth.py
│   └── test_jwt.py
├── attendance_service/
│   ├── test_attendance.py
│   └── test_schedule.py
└── ...
```

## Особенности тестирования

### Тестовые фикстуры
- `client` - HTTP клиент для тестирования API
- `test_db` - тестовая база данных
- `test_redis` - тестовый Redis
- `test_user` - тестовый пользователь

### Тестовые данные
```python
TEST_USER = {
    "email": "test@example.com",
    "password": "testpassword",
    "role": "student"
}

TEST_COURSE = {
    "name": "Test Course",
    "description": "Test Description",
    "teacher_id": "test_teacher_id"
}
```

### Тестирование API
```python
def test_login(client, test_user):
    response = client.post("/auth/login", json={
        "email": test_user["email"],
        "password": test_user["password"]
    })
    assert response.status_code == 200
    assert "access_token" in response.json()
```

### Тестирование базы данных
```python
def test_create_course(test_db, test_teacher):
    course = test_db.courses.insert_one({
        "name": "Test Course",
        "teacher_id": test_teacher["_id"]
    })
    assert course.inserted_id is not None
```

## Ручное тестирование

### Тестовые аккаунты
- Студент:
  - Email: student@example.com
  - Пароль: student123
- Преподаватель:
  - Email: teacher@example.com
  - Пароль: teacher123
- Администратор:
  - Email: admin@example.com
  - Пароль: admin123

### Тестовая база данных
- URL: mongodb://localhost:27017
- База данных: kpius_test
- Пользователь: test
- Пароль: test123

## Интеграционное тестирование

### Тестирование взаимодействия сервисов
```python
def test_auth_attendance_integration(client, test_user):
    # Логин
    login_response = client.post("/auth/login", json={
        "email": test_user["email"],
        "password": test_user["password"]
    })
    token = login_response.json()["access_token"]
    
    # Проверка посещаемости
    attendance_response = client.get(
        "/attendance/check",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert attendance_response.status_code == 200
```

## CI/CD интеграция

### GitHub Actions
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: |
          docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

## Отчеты о тестировании

### Генерация отчетов
```bash
# Генерация HTML отчета
pytest --cov=services --cov-report=html tests/

# Генерация XML отчета
pytest --cov=services --cov-report=xml tests/
```

### Просмотр отчетов
- HTML отчет: `htmlcov/index.html`
- XML отчет: `coverage.xml` 