from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from pydantic_settings import BaseSettings
import motor.motor_asyncio
from typing import List, Optional
from datetime import datetime
from dotenv import load_dotenv
import os
import aiohttp
import pika
import json
import asyncio
import time

load_dotenv()

class Settings(BaseSettings):
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://mongodb:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "kpiusdb")
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")
    RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")

settings = Settings()
app = FastAPI(title="Attendance Service")

# Подключение к MongoDB
client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]

def connect_to_rabbitmq():
    max_retries = 5
    retry_delay = 10
    
    for attempt in range(max_retries):
        try:
            connection = pika.BlockingConnection(pika.URLParameters(settings.RABBITMQ_URL))
            return connection
        except pika.exceptions.AMQPConnectionError as e:
            if attempt < max_retries - 1:
                print(f"Ошибка подключения к RabbitMQ (попытка {attempt + 1}/{max_retries}). Повторная попытка через {retry_delay} секунд...")
                time.sleep(retry_delay)
            else:
                print("Не удалось подключиться к RabbitMQ после всех попыток")
                raise e

# Подключение к RabbitMQ с повторными попытками
connection = connect_to_rabbitmq()
channel = connection.channel()
channel.queue_declare(queue='attendance_notifications')

class AttendanceRecord(BaseModel):
    user_id: str
    timestamp: datetime
    event_type: str  # "check-in" или "check-out"
    location: Optional[str] = None
    device_id: Optional[str] = None

class AttendanceResponse(BaseModel):
    id: str
    user_id: str
    timestamp: datetime
    event_type: str
    location: Optional[str] = None
    device_id: Optional[str] = None

async def verify_token(token: str):
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{settings.AUTH_SERVICE_URL}/users/me",
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            if response.status != 200:
                raise HTTPException(status_code=401, detail="Invalid token")
            return await response.json()

def publish_notification(user_id: str, event_type: str):
    message = {
        "user_id": user_id,
        "event_type": event_type,
        "timestamp": datetime.utcnow().isoformat()
    }
    channel.basic_publish(
        exchange='',
        routing_key='attendance_notifications',
        body=json.dumps(message)
    )

@app.post("/attendance", response_model=AttendanceResponse)
async def record_attendance(record: AttendanceRecord, token: str):
    user = await verify_token(token)
    
    attendance_data = record.dict()
    attendance_data["user_id"] = user["username"]
    
    result = await db.attendance.insert_one(attendance_data)
    attendance_data["id"] = str(result.inserted_id)
    
    # Публикация уведомления
    publish_notification(user["username"], record.event_type)
    
    return AttendanceResponse(**attendance_data)

@app.get("/attendance/{user_id}", response_model=List[AttendanceResponse])
async def get_user_attendance(
    user_id: str,
    token: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    await verify_token(token)
    
    query = {"user_id": user_id}
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            query["timestamp"]["$gte"] = start_date
        if end_date:
            query["timestamp"]["$lte"] = end_date
    
    records = await db.attendance.find(query).sort("timestamp", -1).to_list(length=100)
    return [AttendanceResponse(**record) for record in records]

@app.get("/attendance/stats/{user_id}")
async def get_attendance_stats(user_id: str, token: str):
    await verify_token(token)
    
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {
            "_id": "$event_type",
            "count": {"$sum": 1},
            "last_event": {"$max": "$timestamp"}
        }}
    ]
    
    stats = await db.attendance.aggregate(pipeline).to_list(length=10)
    return stats 