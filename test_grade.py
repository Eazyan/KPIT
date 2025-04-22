#!/usr/bin/env python3
"""
Простой скрипт для создания тестовых оценок для студента
"""

import os
import sys
import random
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId

def create_test_grades():
    """Создает тестовые оценки для студента через прямое взаимодействие с базой данных"""
    # Подключение к MongoDB
    mongo_url = os.environ.get("MONGODB_URL", "mongodb://localhost:27017")
    db_name = os.environ.get("DATABASE_NAME", "kpiusdb")
    print(f"Подключение к MongoDB: {mongo_url}, база данных: {db_name}")
    
    client = MongoClient(mongo_url)
    db = client[db_name]
    
    # Получаем тестового студента
    student = db.users.find_one({"email": "student@dvfu.ru"})
    if not student:
        print("Тестовый студент не найден")
        return
    
    student_id = student["_id"]
    print(f"Найден студент: {student['name']} (ID: {student_id})")
    
    # Находим преподавателя
    teacher = db.users.find_one({"role": "teacher"})
    if not teacher:
        print("Преподаватель не найден")
        return
    
    teacher_id = teacher["_id"]
    print(f"Найден преподаватель: {teacher['name']} (ID: {teacher_id})")
    
    # Получаем дисциплины
    disciplines = list(db.disciplines.find().limit(5))
    if not disciplines:
        print("Дисциплины не найдены")
        return
    
    print(f"Найдено {len(disciplines)} дисциплин")
    
    # Удаляем старые оценки
    result = db.grades.delete_many({"student_id": student_id})
    print(f"Удалено {result.deleted_count} старых оценок")
    
    # Генерируем даты за последние 60 дней
    today = datetime.now()
    dates = [(today - timedelta(days=i)).replace(hour=random.randint(9, 17), minute=random.randint(0, 59)) for i in range(60)]
    
    # Типы оценок
    grade_types = ["Экзамен", "Тест", "Домашняя работа", "Проект", "Активность"]
    
    total_grades = 0
    # Для каждой дисциплины создаем оценки
    for discipline in disciplines:
        discipline_name = discipline.get("name", "Неизвестная дисциплина")
        print(f"Создание оценок для дисциплины: {discipline_name}")
        
        # Создаем от 5 до 15 оценок
        num_grades = random.randint(5, 15)
        for i in range(num_grades):
            # Случайная дата
            grade_date = random.choice(dates)
            
            # Случайная оценка (в основном хорошие 4-5, реже - плохие 2-3)
            value = random.choices([2, 3, 4, 5], weights=[1, 2, 4, 3])[0]
            
            # Случайный тип
            grade_type = random.choice(grade_types)
            
            # Создаем оценку
            grade = {
                "student_id": student_id,
                "discipline_id": discipline["_id"],
                "value": value,  # Целое число, не строка!
                "type": grade_type,
                "description": f"{grade_type} по дисциплине {discipline_name}",
                "date": grade_date,
                "created_at": datetime.utcnow(),
                "created_by": teacher_id
            }
            
            result = db.grades.insert_one(grade)
            if result.inserted_id:
                total_grades += 1
                if i % 5 == 0:  # Печатаем каждую 5-ю оценку
                    print(f"  Добавлена оценка: {value} за {grade_type}")
    
    print(f"Всего добавлено {total_grades} оценок")

if __name__ == "__main__":
    try:
        create_test_grades()
    except Exception as e:
        print(f"Ошибка: {str(e)}")
        sys.exit(1) 