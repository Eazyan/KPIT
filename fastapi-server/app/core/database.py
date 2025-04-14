from pymongo import MongoClient
from pymongo.database import Database
import os
from dotenv import load_dotenv

# Загрузка переменных окружения из файла .env
load_dotenv()

# Получение настроек MongoDB из переменных окружения
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DATABASE_NAME = os.getenv("DATABASE_NAME", "kpiusdb")

# Создание подключения к MongoDB
client = MongoClient(MONGODB_URL)
db: Database = client[DATABASE_NAME]

# Коллекции базы данных
users_collection = db.users
groups_collection = db.groups
disciplines_collection = db.disciplines 