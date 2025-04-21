#!/usr/bin/env python3
"""
Скрипт для генерации тестовых оценок для тестового студента
"""

import logging
import random
import asyncio
import os
from datetime import datetime, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

async def generate_test_grades():
    """
    Генерирует тестовые оценки для тестового студента
    """
    # Подключение к MongoDB
    client = AsyncIOMotorClient(os.getenv("MONGODB_URL", "mongodb://localhost:27017/ksu"))
    db = client["ksu"]
    users_collection = db["users"]
    disciplines_collection = db["disciplines"]
    
    logger.info("Генерация тестовых оценок для тестового студента")
    
    # Используем фиксированный ID для тестового студента
    student_id = "6456d68ffcf4b1c53f0fb4aa"  # Hardcoded ID тестового студента
    
    logger.info(f"Используем ID тестового студента: {student_id}")
    
    # Создаем коллекцию для оценок, если её ещё нет
    if "grades" not in await db.list_collection_names():
        await db.create_collection("grades")
    
    grades_collection = db["grades"]
    
    # Удаляем старые оценки тестового студента
    await grades_collection.delete_many({"student_id": student_id})
    
    # Получаем все дисциплины
    disciplines = []
    cursor = disciplines_collection.find()
    async for doc in cursor:
        disciplines.append(doc)
    
    if not disciplines:
        logger.error("Дисциплины не найдены")
        # Создаем фиктивные дисциплины для демонстрации
        disciplines = [
            {"_id": ObjectId("6456d68ffcf4b1c53f0fb4ab"), "name": "Программирование"},
            {"_id": ObjectId("6456d68ffcf4b1c53f0fb4ac"), "name": "Базы данных"},
            {"_id": ObjectId("6456d68ffcf4b1c53f0fb4ad"), "name": "Алгоритмы и структуры данных"},
            {"_id": ObjectId("6456d68ffcf4b1c53f0fb4ae"), "name": "Математический анализ"},
            {"_id": ObjectId("6456d68ffcf4b1c53f0fb4af"), "name": "Линейная алгебра"}
        ]
    
    logger.info(f"Найдено {len(disciplines)} дисциплин")
    
    # Типы оценок
    grade_types = ["exam", "test", "homework", "project", "activity"]
    
    # Фиксированный ID преподавателя
    teacher_id = "6456d68ffcf4b1c53f0fb4a9"  # Hardcoded ID тестового преподавателя
    
    # Для каждой дисциплины генерируем несколько оценок
    total_grades = 0
    
    for discipline in disciplines[:5]:  # Берем только первые 5 дисциплин
        discipline_id = str(discipline["_id"])
        discipline_name = discipline.get("name", "Неизвестная дисциплина")
        
        # Генерируем от 5 до 15 оценок для дисциплины
        num_grades = random.randint(5, 15)
        
        # Даты для оценок (за последние 3 месяца)
        end_date = datetime.now()
        start_date = end_date - timedelta(days=90)
        
        logger.info(f"Генерация {num_grades} оценок для дисциплины: {discipline_name}")
        
        for i in range(num_grades):
            # Генерируем случайную дату в диапазоне последних 3 месяцев
            grade_date = start_date + timedelta(
                seconds=random.randint(0, int((end_date - start_date).total_seconds()))
            )
            
            # Для первой дисциплины добавляем оценки всех типов
            if disciplines.index(discipline) == 0:
                # Для разнообразия анализа добавляем оценки от 1 до 5
                values = [1, 2, 3, 4, 5]
                value = values[i % len(values)]
                grade_type = grade_types[i % len(grade_types)]
            else:
                # Для остальных дисциплин генерируем случайные оценки
                # С небольшим перекосом в сторону хороших оценок
                value = random.choices([1, 2, 3, 4, 5], weights=[1, 1, 3, 4, 3])[0]
                grade_type = random.choice(grade_types)
            
            # Создаем оценку
            grade = {
                "student_id": student_id,
                "discipline_id": discipline_id,
                "value": value,
                "type": grade_type,
                "description": f"Оценка за {grade_type}",
                "date": grade_date,
                "weight": random.choice([0.5, 1.0, 1.5, 2.0]),  # Разные веса оценок
                "created_at": datetime.utcnow(),
                "created_by": teacher_id
            }
            
            result = await grades_collection.insert_one(grade)
            if result.inserted_id:
                total_grades += 1
    
    logger.info(f"Сгенерировано {total_grades} оценок для тестового студента")

async def main():
    try:
        await generate_test_grades()
    except Exception as e:
        logger.error(f"Ошибка при генерации оценок: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main()) 