FROM ../tests/base/Dockerfile

WORKDIR /app

# Копирование тестов сервиса
COPY tests/auth-service/ .

# Копирование зависимостей сервиса
COPY services/auth-service/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование кода сервиса
COPY services/auth-service/ .

# Установка переменных окружения
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Команда для запуска тестов
CMD ["pytest", "tests/", "--cov=app", "--cov-report=xml"] 