from pymongo import MongoClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://kpius-mongodb-dev:27017/kpit")

async def get_database():
    client = MongoClient(MONGO_URL)
    return client.get_database("kpit") 