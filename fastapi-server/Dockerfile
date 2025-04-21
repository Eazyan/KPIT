FROM python:3.9-slim

WORKDIR /app

# Установка зависимостей
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Копирование проекта
COPY . .

# Порт для FastAPI
EXPOSE 5005

# Запуск приложения с помощью Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "5005", "--reload"] 