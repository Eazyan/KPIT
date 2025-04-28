from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pydantic_settings import BaseSettings
import motor.motor_asyncio
from typing import List, Optional
from datetime import datetime
from dotenv import load_dotenv
import os
import aio_pika
import json
import aiohttp
from jinja2 import Template
import asyncio

load_dotenv()

class Settings(BaseSettings):
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://mongodb:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "kpiusdb")
    RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
    USER_SERVICE_URL: str = os.getenv("USER_SERVICE_URL", "http://user-service:8002")

settings = Settings()
app = FastAPI(title="Notification Service")

# Подключение к MongoDB
client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]

class Notification(BaseModel):
    user_id: str
    type: str
    title: str
    message: str
    created_at: datetime = datetime.utcnow()
    read: bool = False

class NotificationTemplate(BaseModel):
    type: str
    title_template: str
    message_template: str

async def get_user_email(user_id: str) -> str:
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{settings.USER_SERVICE_URL}/users/{user_id}") as response:
            if response.status == 200:
                user_data = await response.json()
                return user_data.get("email")
    return None

async def process_message(message: aio_pika.IncomingMessage):
    async with message.process():
        try:
            body = message.body.decode()
            data = json.loads(body)
            user_id = data.get("user_id")
            event_type = data.get("event_type")
            
            # Создание уведомления
            notification = {
                "user_id": user_id,
                "type": "attendance",
                "title": f"Событие посещаемости: {event_type}",
                "message": f"Зафиксировано событие {event_type} для пользователя {user_id}",
                "created_at": datetime.utcnow(),
                "read": False
            }
            
            # Сохранение в MongoDB
            await db.notifications.insert_one(notification)
            
        except Exception as e:
            print(f"Error processing message: {e}")

async def setup_rabbitmq():
    max_retries = 5
    retry_delay = 10
    
    for attempt in range(max_retries):
        try:
            # Подключение к RabbitMQ
            connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
            channel = await connection.channel()
            
            # Объявление очереди
            queue = await channel.declare_queue("attendance_notifications", durable=True)
            
            # Настройка обработчика сообщений
            await queue.consume(process_message)
            
            return connection, channel
            
        except Exception as e:
            if attempt < max_retries - 1:
                print(f"Ошибка подключения к RabbitMQ (попытка {attempt + 1}/{max_retries}). Повторная попытка через {retry_delay} секунд...")
                await asyncio.sleep(retry_delay)
            else:
                print("Не удалось подключиться к RabbitMQ после всех попыток")
                raise e

@app.on_event("startup")
async def startup_event():
    app.state.rabbitmq_connection, app.state.rabbitmq_channel = await setup_rabbitmq()

@app.on_event("shutdown")
async def shutdown_event():
    if hasattr(app.state, "rabbitmq_connection"):
        await app.state.rabbitmq_connection.close()

@app.get("/notifications/{user_id}", response_model=List[Notification])
async def get_user_notifications(user_id: str, skip: int = 0, limit: int = 10):
    notifications = await db.notifications.find(
        {"user_id": user_id}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    return [Notification(**notification) for notification in notifications]

@app.put("/notifications/{notification_id}/read")
async def mark_notification_as_read(notification_id: str):
    result = await db.notifications.update_one(
        {"_id": notification_id},
        {"$set": {"read": True}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"status": "success"}

@app.post("/notifications/templates", response_model=NotificationTemplate)
async def create_notification_template(template: NotificationTemplate):
    result = await db.notification_templates.insert_one(template.dict())
    template.id = str(result.inserted_id)
    return template

@app.get("/notifications/templates/{type}", response_model=NotificationTemplate)
async def get_notification_template(type: str):
    template = await db.notification_templates.find_one({"type": type})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return NotificationTemplate(**template) 