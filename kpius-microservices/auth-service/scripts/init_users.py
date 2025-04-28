#!/usr/bin/env python3
"""
Скрипт для инициализации тестовых пользователей в базе данных
"""
import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime
from bson import ObjectId

# Настройка хеширования паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def init_users():
    """
    Создает тестовых пользователей в базе данных
    """
    # Подключение к MongoDB
    mongodb_url = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
    database_name = os.environ.get("DATABASE_NAME", "kpiusdb")
    
    print(f"Подключение к MongoDB: {mongodb_url}, БД: {database_name}")
    
    client = AsyncIOMotorClient(mongodb_url)
    db = client[database_name]
    
    # Проверяем, есть ли пользователи в базе
    users_count = await db.users.count_documents({})
    if users_count > 0:
        print(f"В базе данных уже существуют пользователи ({users_count}). Пропускаем инициализацию.")
        return
    
    # Создаем роли
    roles = [
        {"name": "admin", "permissions": ["read", "write", "delete", "admin"]},
        {"name": "teacher", "permissions": ["read", "write"]},
        {"name": "student", "permissions": ["read"]}
    ]
    
    await db.roles.insert_many(roles)
    print("Созданы базовые роли")
    
    # Создаем тестовых пользователей
    test_users = [
        {
            "name": "Администратор Системы",
            "email": "admin@kpius.ru",
            "hashed_password": pwd_context.hash("admin123"),
            "role": "admin",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Преподаватель Тестовый",
            "email": "teacher@kpius.ru",
            "hashed_password": pwd_context.hash("teacher123"),
            "role": "teacher",
            "department": "Информатика и вычислительная техника",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        },
        {
            "name": "Студент Тестовый",
            "email": "student@kpius.ru",
            "hashed_password": pwd_context.hash("student123"),
            "role": "student",
            "group": "Б9121-09.03.03пикд",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
    ]
    
    for user in test_users:
        result = await db.users.insert_one(user)
        print(f"Создан пользователь: {user['name']} (ID: {result.inserted_id})")
    
    print("\nТестовые учетные данные для входа:")
    print(" - Администратор: admin@kpius.ru / admin123")
    print(" - Преподаватель: teacher@kpius.ru / teacher123")
    print(" - Студент: student@kpius.ru / student123")

if __name__ == "__main__":
    asyncio.run(init_users()) 