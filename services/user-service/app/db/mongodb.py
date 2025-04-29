from typing import AsyncGenerator
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

client: AsyncIOMotorClient = None

async def get_database() -> AsyncGenerator[AsyncIOMotorClient, None]:
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
    return client[settings.MONGODB_DB]

async def close_database():
    global client
    if client is not None:
        client.close()
        client = None 