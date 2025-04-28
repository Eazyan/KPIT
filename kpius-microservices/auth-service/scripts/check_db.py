#!/usr/bin/env python3
"""
Скрипт для проверки соединения с базой данных
"""
import sys
import os
import asyncio
import inspect

# Добавляем путь к приложению
sys.path.append('/app')

from app.core.database import client as core_client, connect_to_mongodb as core_connect
from app.db.mongodb import client as db_client, connect_to_mongodb as db_connect
from app.core.config import get_settings

settings = get_settings()

async def check_connections():
    """
    Проверка соединений с базой данных через разные модули
    """
    print(f"Проверка соединений с базой данных в MongoDB: {settings.MONGODB_URL}")
    
    print("\nПроверка app.core.database:")
    print(f"client (до соединения): {core_client}")
    
    print("\nПроверка app.db.mongodb:")
    print(f"client (до соединения): {db_client}")
    
    # Вызов соединения из core.database
    print(f"\nВызов connect_to_mongodb из core.database")
    await core_connect()
    print(f"core.database client (после соединения): {core_client}")
    
    # Вызов соединения из db.mongodb
    print(f"\nВызов connect_to_mongodb из db.mongodb")
    await db_connect()
    print(f"db.mongodb client (после соединения): {db_client}")
    
    print("\nПроверка импортов:")
    # Проверим, что используется в auth.py
    try:
        from app.services.auth import authenticate_user
        auth_file = inspect.getsource(authenticate_user)
        print(f"auth.py импортирует: {'get_user_by_email' in auth_file}")
        
        from app.services.users import get_user_by_email
        users_file = inspect.getsource(get_user_by_email)
        print(f"users.py импортирует из core.database: {'app.core.database' in users_file}")
    except Exception as e:
        print(f"Ошибка при проверке импортов: {e}")
    
    # Проверим данные в коллекции users
    try:
        if core_client:
            print("\nПроверка данных из core_client:")
            core_db = core_client[settings.DATABASE_NAME]
            users = await core_db.users.find({}).to_list(length=10)
            print(f"Количество пользователей: {len(users)}")
            for user in users:
                print(f"- {user.get('email')}")
    except Exception as e:
        print(f"Ошибка при получении данных через core_client: {e}")
    
    try:
        if db_client:
            print("\nПроверка данных из db_client:")
            db_db = db_client[settings.DATABASE_NAME]
            users = await db_db.users.find({}).to_list(length=10)
            print(f"Количество пользователей: {len(users)}")
            for user in users:
                print(f"- {user.get('email')}")
    except Exception as e:
        print(f"Ошибка при получении данных через db_client: {e}")

if __name__ == "__main__":
    asyncio.run(check_connections()) 