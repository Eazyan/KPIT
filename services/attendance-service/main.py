from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
import motor.motor_asyncio
from typing import List, Optional, Annotated
from datetime import datetime, UTC
from dotenv import load_dotenv
import os
import aiohttp
import aio_pika
import json
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
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")
    RABBITMQ_URL: str = os.getenv("RABBITMQ_URL", "amqp://guest:guest@rabbitmq:5672/")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key")

settings = Settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Startup
        app.state.rabbitmq_connection, app.state.rabbitmq_channel, app.state.rabbitmq_queue = await setup_rabbitmq()
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

app = FastAPI(title="Attendance Service", lifespan=lifespan)

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

async def setup_rabbitmq():
    max_retries = 5
    retry_delay = 10
    
    for attempt in range(max_retries):
        try:
            connection = await aio_pika.connect_robust(settings.RABBITMQ_URL)
            channel = await connection.channel()
            queue = await channel.declare_queue("attendance_notifications", durable=True)
            return connection, channel, queue
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

class AttendanceRecord(BaseModel):
    user_id: str = Field(..., description="ID пользователя")
    timestamp: datetime = Field(default_factory=datetime.now, description="Время события")
    event_type: str = Field(..., description="Тип события (check-in или check-out)")
    location: Optional[str] = Field(None, description="Местоположение")
    device_id: Optional[str] = Field(None, description="ID устройства")

class AttendanceResponse(BaseModel):
    id: str = Field(..., description="ID записи")
    user_id: str = Field(..., description="ID пользователя")
    timestamp: datetime = Field(..., description="Время события")
    event_type: str = Field(..., description="Тип события")
    location: Optional[str] = Field(None, description="Местоположение")
    device_id: Optional[str] = Field(None, description="ID устройства")

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

async def publish_notification(user_id: str, event_type: str):
    try:
        message = {
            "user_id": user_id,
            "event_type": event_type,
            "timestamp": datetime.now(UTC).isoformat()
        }
        await app.state.rabbitmq_channel.default_exchange.publish(
            aio_pika.Message(
                body=json.dumps(message).encode(),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT
            ),
            routing_key="attendance_notifications"
        )
        logger.info(f"Notification published for user {user_id}, event {event_type}")
    except Exception as e:
        logger.error(f"Failed to publish notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при отправке уведомления"
        )

@app.post("/attendance", response_model=AttendanceResponse)
async def record_attendance(
    record: AttendanceRecord,
    current_user: Annotated[dict, Depends(get_current_user)]
):
    # Проверяем права доступа
    if current_user["role"] not in ["admin", "manager"] and current_user["username"] != record.user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для записи посещаемости"
        )
    
    attendance_data = record.dict()
    attendance_data["user_id"] = current_user["username"]
    
    try:
        result = await db.attendance.insert_one(attendance_data)
        attendance_data["id"] = str(result.inserted_id)
        
        # Публикация уведомления
        await publish_notification(current_user["username"], record.event_type)
        
        return AttendanceResponse(**attendance_data)
    except Exception as e:
        logger.error(f"Error recording attendance: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при записи посещаемости"
        )

@app.get("/attendance/{user_id}", response_model=List[AttendanceResponse])
async def get_user_attendance(
    user_id: str,
    current_user: Annotated[dict, Depends(get_current_user)],
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
):
    # Проверяем права доступа
    if current_user["role"] not in ["admin", "manager"] and current_user["username"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра посещаемости"
        )
    
    query = {"user_id": user_id}
    if start_date or end_date:
        query["timestamp"] = {}
        if start_date:
            query["timestamp"]["$gte"] = start_date
        if end_date:
            query["timestamp"]["$lte"] = end_date
    
    try:
        records = await db.attendance.find(query).sort("timestamp", -1).to_list(length=100)
        return [AttendanceResponse(**record) for record in records]
    except Exception as e:
        logger.error(f"Error getting attendance records: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении записей посещаемости"
        )

@app.get("/attendance/stats/{user_id}")
async def get_attendance_stats(
    user_id: str,
    current_user: Annotated[dict, Depends(get_current_user)]
):
    # Проверяем права доступа
    if current_user["role"] not in ["admin", "manager"] and current_user["username"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра статистики"
        )
    
    try:
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
    except Exception as e:
        logger.error(f"Error getting attendance stats: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении статистики"
        ) 