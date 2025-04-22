#!/usr/bin/env python3
"""
Скрипт для заполнения базы данных тестовыми данными.
"""

import logging
import asyncio
import os
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Хэширование паролей
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_database():
    """
    Заполняет базу данных тестовыми данными.
    """
    # Подключение к MongoDB
    mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.getenv("DATABASE_NAME", "kpiusdb")
    logger.info(f"Подключение к MongoDB: {mongo_url}, база данных: {db_name}")
    
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    # Проверяем и очищаем базу данных
    logger.info("Очистка базы данных...")
    await clear_data(db)
    
    # Создаем тестовые группы
    logger.info("Создание тестовых групп...")
    group_ids = await create_test_groups(db)
    
    # Создаем тестовых пользователей
    logger.info("Создание тестовых пользователей...")
    await create_test_users(db, group_ids)
    
    # Создаем тестовые дисциплины
    logger.info("Создание тестовых дисциплин...")
    await create_test_disciplines(db)
    
    logger.info("База данных успешно заполнена тестовыми данными.")
    
    # Выводим информацию для входа
    logger.info("Данные для входа в систему:")
    logger.info("Администратор: admin@dvfu.ru / password")
    logger.info("Заведующий кафедрой: head@dvfu.ru / password")
    logger.info("Преподаватель: teacher@dvfu.ru / password")
    logger.info("Студент: student@dvfu.ru / password")
    logger.info("Это тестовые учетные записи. Не используйте их в производственной среде.")

async def clear_data(db):
    """
    Очищает базу данных от предыдущих тестовых данных.
    """
    # Очищаем коллекции, если они существуют
    if "users" in await db.list_collection_names():
        result = await db["users"].delete_many({})
        logger.info(f"Удалено {result.deleted_count} пользователей")
    
    if "groups" in await db.list_collection_names():
        result = await db["groups"].delete_many({})
        logger.info(f"Удалено {result.deleted_count} групп")
    
    if "disciplines" in await db.list_collection_names():
        result = await db["disciplines"].delete_many({})
        logger.info(f"Удалено {result.deleted_count} дисциплин")

async def create_test_groups(db):
    """
    Создает тестовые группы в базе данных.
    Возвращает словарь с ID созданных групп.
    """
    groups_collection = db["groups"]
    
    # Создаем группы
    group_data = [
        {"name": "Б9121-09.03.03пикд", "year": 2021, "specialization": "Прикладная информатика"},
        {"name": "Б9122-09.03.03пикд", "year": 2022, "specialization": "Прикладная информатика"},
        {"name": "Б9120-09.03.03пикд", "year": 2020, "specialization": "Прикладная информатика"},
        {"name": "Б9121-01.03.02пми", "year": 2021, "specialization": "Прикладная математика и информатика"},
        {"name": "Б9120-02.03.01мкн", "year": 2020, "specialization": "Математика и компьютерные науки"}
    ]
    
    group_ids = {}
    for group in group_data:
        result = await groups_collection.insert_one(group)
        group_ids[group["name"]] = result.inserted_id
        logger.info(f"Создана группа: {group['name']} (ID: {result.inserted_id})")
    
    return group_ids

async def create_test_users(db, group_ids):
    """
    Создает тестовых пользователей в базе данных.
    """
    users_collection = db["users"]
    
    # Создаем администратора
    admin_data = {
        "email": "admin@dvfu.ru",
        "hashed_password": pwd_context.hash("password"),
        "name": "Администратор Системы",
        "role": "administrator",
        "position": "Администратор системы",
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    result = await users_collection.insert_one(admin_data)
    logger.info(f"Создан администратор: {admin_data['name']} (ID: {result.inserted_id})")
    
    # Создаем заведующего кафедрой
    head_data = {
        "email": "head@dvfu.ru",
        "hashed_password": pwd_context.hash("password"),
        "name": "Петров Петр Петрович",
        "role": "head_of_department",
        "position": "Заведующий кафедрой",
        "department": "Кафедра информационных технологий",
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    result = await users_collection.insert_one(head_data)
    logger.info(f"Создан заведующий кафедрой: {head_data['name']} (ID: {result.inserted_id})")
    head_id = result.inserted_id
    
    # Создаем преподавателя
    teacher_data = {
        "email": "teacher@dvfu.ru",
        "hashed_password": pwd_context.hash("password"),
        "name": "Иванов Иван Иванович",
        "role": "teacher",
        "position": "Доцент",
        "department": "Кафедра информационных технологий",
        "head_id": head_id,
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    result = await users_collection.insert_one(teacher_data)
    logger.info(f"Создан преподаватель: {teacher_data['name']} (ID: {result.inserted_id})")
    
    # Создаем тестового студента
    student_data = {
        "email": "student@dvfu.ru",
        "hashed_password": pwd_context.hash("password"),
        "name": "Сидоров Сидор Сидорович",
        "role": "student",
        "group_id": group_ids["Б9121-09.03.03пикд"],
        "is_active": True,
        "created_at": datetime.utcnow()
    }
    result = await users_collection.insert_one(student_data)
    logger.info(f"Создан студент: {student_data['name']} (ID: {result.inserted_id})")
    
    # Создаем дополнительных студентов для разных групп
    # По 20 студентов на группу
    for group_name, group_id in group_ids.items():
        logger.info(f"Создание студентов для группы {group_name}...")
        for i in range(1, 21):
            student_data = {
                "email": f"student{i}_{group_name.split('-')[0].lower()}@dvfu.ru",
                "hashed_password": pwd_context.hash("password"),
                "name": f"Студент {i} {group_name}",
                "role": "student",
                "group_id": group_id,
                "is_active": True,
                "created_at": datetime.utcnow()
            }
            result = await users_collection.insert_one(student_data)
            if i % 5 == 0:  # Логируем только каждого 5-го студента для экономии вывода
                logger.info(f"Создан студент: {student_data['name']} (ID: {result.inserted_id})")

async def create_test_disciplines(db):
    """
    Создает тестовые дисциплины в базе данных.
    """
    disciplines_collection = db["disciplines"]
    users_collection = db["users"]
    
    # Находим преподавателя
    teacher = await users_collection.find_one({"role": "teacher"})
    if not teacher:
        logger.error("Преподаватель не найден. Невозможно создать дисциплины.")
        return
    
    teacher_id = teacher["_id"]
    
    # Создаем дисциплины
    disciplines_data = [
        {"name": "Программирование", "teacher": teacher_id, "semester": 1},
        {"name": "Базы данных", "teacher": teacher_id, "semester": 1},
        {"name": "Алгоритмы и структуры данных", "teacher": teacher_id, "semester": 2},
        {"name": "Математический анализ", "teacher": teacher_id, "semester": 1},
        {"name": "Линейная алгебра", "teacher": teacher_id, "semester": 2},
        {"name": "Дискретная математика", "teacher": teacher_id, "semester": 3},
        {"name": "Операционные системы", "teacher": teacher_id, "semester": 3},
        {"name": "Компьютерные сети", "teacher": teacher_id, "semester": 4},
        {"name": "Веб-программирование", "teacher": teacher_id, "semester": 4},
        {"name": "Машинное обучение", "teacher": teacher_id, "semester": 5}
    ]
    
    for discipline in disciplines_data:
        result = await disciplines_collection.insert_one(discipline)
        logger.info(f"Создана дисциплина: {discipline['name']} (ID: {result.inserted_id})")

async def main():
    try:
        await seed_database()
    except Exception as e:
        logger.error(f"Ошибка при заполнении базы данных: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main()) 