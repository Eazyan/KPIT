#!/usr/bin/env python3
"""
Скрипт для заполнения базы данных тестовыми данными
"""

import logging
from app.core.database import db, users_collection, groups_collection, disciplines_collection
from app.models.user import UserRole
from app.core.security import get_password_hash
from datetime import datetime
from bson import ObjectId

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def main():
    """Основная функция для заполнения базы данных тестовыми данными"""
    try:
        # Очистка коллекций
        logger.info("Очистка существующих данных...")
        users_collection.delete_many({})
        groups_collection.delete_many({})
        disciplines_collection.delete_many({})
        
        # Создание групп
        logger.info("Создание тестовых групп...")
        groups = [
            {
                "name": "Б9123-01.03.02",
                "department": "Информатика и вычислительная техника",
                "specialization": "Программная инженерия",
                "course": 1,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Б9122-01.03.02",
                "department": "Информатика и вычислительная техника",
                "specialization": "Программная инженерия",
                "course": 2,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Б9121-10.03.01",
                "department": "Информационная безопасность",
                "specialization": "Кибербезопасность",
                "course": 3,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        group_ids = []
        group_names = []
        for group in groups:
            result = groups_collection.insert_one(group)
            group_ids.append(result.inserted_id)
            group_names.append(group['name'])
            logger.info(f"Создана группа: {group['name']}")
        
        # Создание пользователей разных ролей
        logger.info("Создание тестовых пользователей...")
        users = [
            {
                "name": "Администратор",
                "email": "admin@test.com",
                "password_hash": get_password_hash("password123"),
                "role": UserRole.ADMIN,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Заведующий кафедрой",
                "email": "head@test.com",
                "password_hash": get_password_hash("password123"),
                "role": UserRole.HEAD_OF_DEPARTMENT,
                "department": "Информатика и вычислительная техника",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Преподаватель",
                "email": "teacher@test.com",
                "password_hash": get_password_hash("password123"),
                "role": UserRole.TEACHER,
                "department": "Информатика и вычислительная техника",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Студент",
                "email": "student@test.com",
                "password_hash": get_password_hash("password123"),
                "role": UserRole.STUDENT,
                "group": group_names[0],  # Используем название группы вместо ID
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        user_ids = []
        for user in users:
            result = users_collection.insert_one(user)
            user_ids.append(result.inserted_id)
            logger.info(f"Создан пользователь: {user['name']} ({user['email']})")
        
        # Создание дисциплин
        logger.info("Создание тестовых дисциплин...")
        disciplines = [
            {
                "name": "Программирование",
                "teacher": user_ids[2],  # Преподаватель
                "semester": 1,
                "groups": [group_ids[0]],  # Б9123-01.03.02
                "department": "Информатика и вычислительная техника",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Базы данных",
                "teacher": user_ids[2],  # Преподаватель
                "semester": 3,
                "groups": [group_ids[1]],  # Б9122-01.03.02
                "department": "Информатика и вычислительная техника",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Защита информации",
                "teacher": user_ids[2],  # Преподаватель
                "semester": 5,
                "groups": [group_ids[2]],  # Б9121-10.03.01
                "department": "Информационная безопасность",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        for discipline in disciplines:
            result = disciplines_collection.insert_one(discipline)
            logger.info(f"Создана дисциплина: {discipline['name']}")
        
        logger.info("\nБаза данных успешно заполнена тестовыми данными.")
        logger.info("Учетные данные для входа:")
        logger.info(" - Администратор: admin@test.com / password123")
        logger.info(" - Заведующий кафедрой: head@test.com / password123")
        logger.info(" - Преподаватель: teacher@test.com / password123")
        logger.info(" - Студент: student@test.com / password123")
    except Exception as e:
        logger.error(f"Ошибка при заполнении базы данных: {str(e)}")

if __name__ == "__main__":
    main() 