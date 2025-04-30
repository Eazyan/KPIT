from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from pymongo import MongoClient
from typing import Optional, AsyncGenerator
from fastapi import Depends

from app.core.config import settings

class MongoDB:
    client: Optional[AsyncIOMotorClient] = None
    sync_client: Optional[MongoClient] = None
    db = None

    @classmethod
    async def connect_to_mongo(cls):
        cls.client = AsyncIOMotorClient(settings.MONGODB_URL)
        cls.db = cls.client[settings.DATABASE_NAME]
        cls.sync_client = MongoClient(settings.MONGODB_URL)

    @classmethod
    async def close_mongo_connection(cls):
        if cls.client:
            cls.client.close()
        if cls.sync_client:
            cls.sync_client.close()

    @classmethod
    async def get_db(cls) -> AsyncGenerator[AsyncIOMotorDatabase, None]:
        if not cls.client:
            await cls.connect_to_mongo()
        yield cls.db

    @classmethod
    def get_sync_db(cls):
        if not cls.sync_client:
            cls.sync_client = MongoClient(settings.MONGODB_URL)
        return cls.sync_client[settings.DATABASE_NAME] 