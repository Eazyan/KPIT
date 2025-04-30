from typing import AsyncGenerator, Optional
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection, AsyncIOMotorDatabase
from app.core.config import settings

client: AsyncIOMotorClient = None

class MongoDB:
    def __init__(self, database_url: str = None, database_name: str = None):
        self.client = AsyncIOMotorClient(database_url or settings.MONGODB_URL)
        self.db = self.client[database_name or settings.MONGODB_DB]

    def get_collection(self, collection_name: str) -> AsyncIOMotorCollection:
        return self.db[collection_name]

    def get_database(self) -> AsyncIOMotorDatabase:
        return self.db

    async def close(self):
        if self.client:
            self.client.close()

async def get_database() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    global client
    if client is None:
        client = AsyncIOMotorClient(settings.MONGODB_URL)
    yield client[settings.MONGODB_DB]

async def close_database():
    global client
    if client is not None:
        client.close()
        client = None 