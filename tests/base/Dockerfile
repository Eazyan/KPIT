FROM python:3.11-slim

WORKDIR /app

# Установка зависимостей
COPY requirements-test.txt .
RUN pip install --no-cache-dir -r requirements-test.txt

# Копирование общих тестовых утилит
COPY base/ .

# Установка переменных окружения
ENV PYTHONPATH=/app
ENV PYTHONUNBUFFERED=1

# Команда по умолчанию
CMD ["pytest", "--cov=app", "--cov-report=xml"] 