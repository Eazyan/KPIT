from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
import motor.motor_asyncio
from typing import List, Optional, Annotated
from datetime import datetime, UTC
from dotenv import load_dotenv
import os
import aio_pika
import json
import aiohttp
from jinja2 import Template
import asyncio
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
import logging

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class Settings(BaseSettings):
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://mongodb:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "kpiusdb")
    RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
    USER_SERVICE_URL: str = os.getenv("USER_SERVICE_URL", "http://user-service:8002")
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key")

settings = Settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Startup
        app.state.rabbitmq_connection, app.state.rabbitmq_channel = await setup_rabbitmq()
        logger.info("RabbitMQ connection established")
        yield
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise
    finally:
        # Shutdown
        if hasattr(app.state, "rabbitmq_connection"):
            await app.state.rabbitmq_connection.close()
            logger.info("RabbitMQ connection closed")

app = FastAPI(title="Notification Service", lifespan=lifespan)

# Настройки CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение к MongoDB
client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.AUTH_SERVICE_URL}/token")

class Notification(BaseModel):
    user_id: str = Field(..., description="ID пользователя")
    type: str = Field(..., description="Тип уведомления")
    title: str = Field(..., description="Заголовок уведомления")
    message: str = Field(..., description="Текст уведомления")
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC), description="Время создания")
    read: bool = Field(default=False, description="Статус прочтения")

class NotificationTemplate(BaseModel):
    type: str = Field(..., description="Тип шаблона")
    title_template: str = Field(..., description="Шаблон заголовка")
    message_template: str = Field(..., description="Шаблон сообщения")

async def verify_token(token: Annotated[str, Depends(oauth2_scheme)]) -> dict:
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(
                f"{settings.AUTH_SERVICE_URL}/users/me",
                headers={"Authorization": f"Bearer {token}"}
            ) as response:
                if response.status != 200:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Неверный токен"
                    )
                return await response.json()
        except aiohttp.ClientError as e:
            logger.error(f"Auth service error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Сервис аутентификации недоступен"
            )

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> dict:
    return await verify_token(token)

async def get_user_email(user_id: str) -> Optional[str]:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{settings.USER_SERVICE_URL}/users/{user_id}") as response:
                if response.status == 200:
                    user_data = await response.json()
                    return user_data.get("email")
                logger.warning(f"User not found: {user_id}")
                return None
    except aiohttp.ClientError as e:
        logger.error(f"User service error: {str(e)}")
        return None

async def process_message(message: aio_pika.IncomingMessage):
    async with message.process():
        try:
            body = message.body.decode()
            data = json.loads(body)
            user_id = data.get("user_id")
            event_type = data.get("event_type")
            
            # Получаем шаблон уведомления
            template = await db.notification_templates.find_one({"type": "attendance"})
            if not template:
                template = {
                    "title_template": "Событие посещаемости: {event_type}",
                    "message_template": "Зафиксировано событие {event_type} для пользователя {user_id}"
                }
            
            # Создаем уведомление с использованием шаблона
            notification = {
                "user_id": user_id,
                "type": "attendance",
                "title": template["title_template"].format(event_type=event_type),
                "message": template["message_template"].format(
                    event_type=event_type,
                    user_id=user_id
                ),
                "created_at": datetime.now(UTC),
                "read": False
            }
            
            # Сохранение в MongoDB
            await db.notifications.insert_one(notification)
            logger.info(f"Notification created for user {user_id}, type {event_type}")
            
        except Exception as e:
            logger.error(f"Error processing message: {str(e)}")
            # Не подтверждаем сообщение в случае ошибки
            await message.nack()

async def setup_rabbitmq():
    max_retries = 5
    retry_delay = 10
    
    for attempt in range(max_retries):
        try:
            connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
            channel = await connection.channel()
            queue = await channel.declare_queue("attendance_notifications", durable=True)
            await queue.consume(process_message)
            return connection, channel
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"RabbitMQ connection failed (attempt {attempt + 1}/{max_retries}). Retrying in {retry_delay} seconds...")
                await asyncio.sleep(retry_delay)
            else:
                logger.error("Failed to connect to RabbitMQ after all attempts")
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Не удалось подключиться к RabbitMQ"
                )

@app.get("/notifications/{user_id}", response_model=List[Notification])
async def get_user_notifications(
    user_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    skip: int = 0,
    limit: int = 10
):
    # Проверяем права доступа
    if current_user["role"] not in ["admin", "manager"] and current_user["username"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра уведомлений"
        )
    
    try:
        notifications = await db.notifications.find(
            {"user_id": user_id}
        ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
        return [Notification(**notification) for notification in notifications]
    except Exception as e:
        logger.error(f"Error getting notifications: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении уведомлений"
        )

@app.put("/notifications/{notification_id}/read")
async def mark_notification_as_read(
    notification_id: str,
    current_user: Annotated[dict, Depends(get_current_user)]
):
    try:
        # Проверяем принадлежность уведомления
        notification = await db.notifications.find_one({"_id": notification_id})
        if not notification:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Уведомление не найдено"
            )
        
        if current_user["role"] not in ["admin", "manager"] and current_user["username"] != notification["user_id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Недостаточно прав для изменения уведомления"
            )
        
        result = await db.notifications.update_one(
            {"_id": notification_id},
            {"$set": {"read": True}}
        )
        
        if result.modified_count == 0:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Уведомление не найдено"
            )
        
        return {"status": "success"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при обновлении уведомления"
        )

@app.post("/notifications/templates", response_model=NotificationTemplate)
async def create_notification_template(
    template: NotificationTemplate,
    current_user: Annotated[dict, Depends(get_current_user)]
):
    # Проверяем права доступа
    if current_user["role"] not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для создания шаблонов"
        )
    
    try:
        result = await db.notification_templates.insert_one(template.dict())
        template.id = str(result.inserted_id)
        return template
    except Exception as e:
        logger.error(f"Error creating template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при создании шаблона"
        )

@app.get("/notifications/templates/{type}", response_model=NotificationTemplate)
async def get_notification_template(
    type: str,
    current_user: Annotated[dict, Depends(get_current_user)]
):
    # Проверяем права доступа
    if current_user["role"] not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра шаблонов"
        )
    
    try:
        template = await db.notification_templates.find_one({"type": type})
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Шаблон не найден"
            )
        return NotificationTemplate(**template)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении шаблона"
        ) 