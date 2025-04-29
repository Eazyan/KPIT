# Развертывание КПиУС

## Предварительные требования

- [Docker](https://docs.docker.com/get-docker/)
- [Docker Compose](https://docs.docker.com/compose/install/)
- [Git](https://git-scm.com/downloads)

## Развертывание в режиме разработки

### 1. Клонирование репозитория
```bash
git clone https://github.com/your-org/kpius.git
cd kpius
```

### 2. Настройка окружения
```bash
# Копирование шаблонов конфигурации
cp .env.template .env
cp services/auth-service/.env.template services/auth-service/.env
# и т.д. для каждого сервиса
```

### 3. Запуск сервисов
```bash
# Запуск всех сервисов
docker-compose up --build

# Запуск конкретного сервиса
docker-compose up --build auth-service
docker-compose up --build attendance-service
# и т.д.
```

### 4. Проверка работоспособности
- Клиентское приложение: http://localhost:3000
- API сервер: http://localhost:5005
- MongoDB: localhost:27017

## Развертывание в продакшене

### 1. Подготовка сервера
```bash
# Установка Docker и Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Установка Git
sudo apt-get update
sudo apt-get install git
```

### 2. Настройка окружения
```bash
# Создание директории для проекта
mkdir /opt/kpius
cd /opt/kpius

# Клонирование репозитория
git clone https://github.com/your-org/kpius.git .

# Настройка конфигурации
cp .env.template .env
# Редактирование .env файла
nano .env
```

### 3. Запуск в продакшен режиме
```bash
# Сборка и запуск
docker-compose -f docker-compose.prod.yml up --build -d

# Проверка статуса
docker-compose -f docker-compose.prod.yml ps
```

### 4. Масштабирование
```bash
# Масштабирование auth-service
docker-compose -f docker-compose.prod.yml up --build -d --scale auth-service=3

# Масштабирование attendance-service
docker-compose -f docker-compose.prod.yml up --build -d --scale attendance-service=2
```

## Конфигурация сервисов

### Общие настройки (.env)
```env
# Общие настройки
MONGODB_URL=mongodb://mongodb:27017
DATABASE_NAME=kpiusdb

# Настройки JWT
JWT_SECRET=your-secret-key
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Настройки Redis
REDIS_URL=redis://redis:6379
```

### Настройки сервисов
Каждый сервис имеет свой файл конфигурации `.env` в соответствующей директории.

## Мониторинг и логирование

### Prometheus + Grafana
```bash
# Запуск мониторинга
docker-compose -f docker-compose.monitoring.yml up -d
```

Доступ к Grafana: http://localhost:3000

### ELK Stack
```bash
# Запуск логирования
docker-compose -f docker-compose.logging.yml up -d
```

Доступ к Kibana: http://localhost:5601

## Резервное копирование

### База данных
```bash
# Создание бэкапа
docker-compose exec mongodb mongodump --out /backup

# Восстановление из бэкапа
docker-compose exec mongodb mongorestore /backup
```

### Конфигурация
- Хранение конфигурации в Git
- Использование секретов Docker
- Ротация ключей

## Обновление

### Обновление кода
```bash
# Получение последних изменений
git pull

# Пересборка и перезапуск
docker-compose -f docker-compose.prod.yml up --build -d
```

### Обновление данных
```bash
# Миграция базы данных
docker-compose exec mongodb mongorestore --drop /migrations
```

## Устранение неполадок

### Проверка логов
```bash
# Просмотр логов всех сервисов
docker-compose logs -f

# Просмотр логов конкретного сервиса
docker-compose logs -f auth-service
```

### Проверка статуса
```bash
# Статус контейнеров
docker-compose ps

# Использование ресурсов
docker stats
```

### Перезапуск сервисов
```bash
# Перезапуск всех сервисов
docker-compose restart

# Перезапуск конкретного сервиса
docker-compose restart auth-service
``` 