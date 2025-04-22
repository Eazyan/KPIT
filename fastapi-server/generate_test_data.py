#!/usr/bin/env python3
"""
Скрипт для генерации всех тестовых данных для проекта КПиУС:
- пользователи (студенты, преподаватели, администраторы)
- группы
- дисциплины
- оценки
"""

import logging
import random
import os
from datetime import datetime, timedelta
from pymongo import MongoClient
from bson import ObjectId
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

# Импорт необходимых модулей из приложения
try:
    from app.core.database import db, users_collection, groups_collection, disciplines_collection
    from app.models.user import UserRole
    from app.core.security import get_password_hash
    APP_IMPORTS_AVAILABLE = True
except ImportError:
    APP_IMPORTS_AVAILABLE = False

# Настройка логирования
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Данные для генерации имен
MALE_FIRST_NAMES = ["Александр", "Дмитрий", "Максим", "Иван", "Артем", "Сергей", "Андрей", 
                  "Никита", "Михаил", "Егор", "Даниил", "Кирилл", "Илья", "Тимофей", 
                  "Роман", "Владислав", "Матвей", "Алексей", "Николай", "Глеб"]
FEMALE_FIRST_NAMES = ["Анастасия", "Мария", "Анна", "Виктория", "Екатерина", "Дарья", 
                     "Полина", "София", "Алиса", "Валерия", "Александра", "Ксения", 
                     "Арина", "Вероника", "Юлия", "Елизавета", "Татьяна", "Ольга", 
                     "Диана", "Евгения"]
LAST_NAMES_MALE = ["Иванов", "Смирнов", "Кузнецов", "Попов", "Васильев", "Петров", "Соколов", 
                   "Михайлов", "Новиков", "Федоров", "Морозов", "Волков", "Алексеев", 
                   "Лебедев", "Семенов", "Егоров", "Павлов", "Козлов", "Степанов", "Николаев"]
LAST_NAMES_FEMALE = ["Иванова", "Смирнова", "Кузнецова", "Попова", "Васильева", "Петрова", 
                     "Соколова", "Михайлова", "Новикова", "Федорова", "Морозова", "Волкова", 
                     "Алексеева", "Лебедева", "Семенова", "Егорова", "Павлова", "Козлова", 
                     "Степанова", "Николаева"]
DEPARTMENT_NAMES = [
    "Информатика и вычислительная техника",
    "Прикладная математика",
    "Информационная безопасность",
    "Программная инженерия",
    "Экономика и управление",
    "Физико-математические науки"
]
SUBJECT_NAMES = [
    "Программирование",
    "Базы данных",
    "Алгоритмы и структуры данных",
    "Компьютерные сети",
    "Операционные системы",
    "Математический анализ",
    "Линейная алгебра",
    "Дискретная математика",
    "Информационная безопасность",
    "Теория вероятностей",
    "Архитектура компьютера",
    "Веб-технологии",
    "Машинное обучение",
    "Искусственный интеллект",
    "Компьютерная графика",
    "Разработка мобильных приложений"
]

def generate_email(first_name, last_name, domain="dvfu.ru"):
    """Генерирует email на основе имени и фамилии"""
    transliteration_map = {
        'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'e',
        'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
        'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
        'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
        'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
    }
    
    def transliterate(text):
        text = text.lower()
        result = ""
        for char in text:
            result += transliteration_map.get(char, char)
        return result
    
    email_first_name = transliterate(first_name.lower())
    email_last_name = transliterate(last_name.lower())
    
    # Добавляем случайное число, чтобы избежать дубликатов
    random_num = random.randint(1, 999)
    
    return f"{email_first_name}.{email_last_name}{random_num}@{domain}"

def generate_random_name(gender=None):
    """Генерирует случайное имя и фамилию"""
    if gender is None:
        gender = random.choice(["male", "female"])
        
    if gender == "male":
        first_name = random.choice(MALE_FIRST_NAMES)
        last_name = random.choice(LAST_NAMES_MALE)
    else:
        first_name = random.choice(FEMALE_FIRST_NAMES)
        last_name = random.choice(LAST_NAMES_FEMALE)
        
    return first_name, last_name, gender

def generate_student_group(course=None, specialization=None):
    """Генерирует название группы для студента"""
    if course is None:
        course = random.randint(1, 4)
        
    year = 2024 - course
    last_two_digits = year % 100
    
    codes = ["01.03.02", "09.03.03", "10.03.01", "03.03.02", "38.03.05"]
    if specialization is None:
        code = random.choice(codes)
    else:
        # Преобразуем названия специализаций в коды
        specialization_to_code = {
            "Прикладная математика и информатика": "01.03.02",
            "Программная инженерия": "09.03.03",
            "Информационная безопасность": "10.03.01",
            "Физика": "03.03.02",
            "Бизнес-информатика": "38.03.05"
        }
        code = specialization_to_code.get(specialization, random.choice(codes))
    
    number = random.randint(1, 3)
    return f"Б{last_two_digits}{course}{number}-{code}"

# Функция для получения хэша пароля (если нет импорта из приложения)
def fallback_get_password_hash(password):
    """Простая функция хеширования для случая, когда нет доступа к app.core.security"""
    import hashlib
    return hashlib.sha256(password.encode()).hexdigest()

def hash_password(password):
    """Хеширует пароль, используя функцию из приложения или запасную"""
    if APP_IMPORTS_AVAILABLE:
        return get_password_hash(password)
    else:
        return fallback_get_password_hash(password)

def connect_db():
    """Подключается к базе данных и возвращает необходимые коллекции"""
    global db, users_collection, groups_collection, disciplines_collection, grades_collection

    if APP_IMPORTS_AVAILABLE:
        # Если импорты доступны, используем объекты из app.core.database
        grades_collection = db["grades"]
        logger.info("Используем подключение к БД из приложения")
        return db, users_collection, groups_collection, disciplines_collection, grades_collection
    else:
        # Иначе создаем новое подключение
        mongo_url = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
        db_name = os.getenv("DATABASE_NAME", "kpiusdb")
        logger.info(f"Подключение к MongoDB: {mongo_url}, база данных: {db_name}")
        
        client = MongoClient(mongo_url)
        db = client[db_name]
        
        users_collection = db["users"]
        groups_collection = db["groups"]
        disciplines_collection = db["disciplines"]
        grades_collection = db["grades"]
        
        return db, users_collection, groups_collection, disciplines_collection, grades_collection

def create_test_data(count=100, clear_db=False):
    """Генерирует все тестовые данные - пользователей, группы, дисциплины"""
    try:
        # Подключаемся к базе данных
        db, users_collection, groups_collection, disciplines_collection, grades_collection = connect_db()
        
        if clear_db:
            # Очистка коллекций
            logger.info("Очистка существующих данных...")
            users_collection.delete_many({})
            groups_collection.delete_many({})
            disciplines_collection.delete_many({})
            grades_collection.delete_many({})
        
        # Создаем группы
        logger.info("Создание учебных групп...")
        specializations = [
            "Прикладная математика и информатика",
            "Программная инженерия",
            "Информационная безопасность",
            "Физика",
            "Бизнес-информатика"
        ]
        
        groups = []
        group_names = []
        for i, specialization in enumerate(specializations):
            for course in range(1, 5):  # 4 курса
                group_name = generate_student_group(course, specialization)
                department = DEPARTMENT_NAMES[min(i, len(DEPARTMENT_NAMES)-1)]
                
                group = {
                    "name": group_name,
                    "department": department,
                    "specialization": specialization,
                    "course": course,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                result = groups_collection.insert_one(group)
                groups.append({"id": result.inserted_id, "data": group})
                group_names.append(group_name)
                logger.info(f"Создана группа: {group_name}")
        
        # Создаем предопределенных пользователей
        logger.info("Создание предопределенных пользователей...")
        default_users = [
            {
                "name": "Администратор Системы",
                "email": "admin@dvfu.ru",
                "password_hash": hash_password("admin123"),
                "role": "admin" if not APP_IMPORTS_AVAILABLE else UserRole.ADMIN,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Заведующий Кафедрой",
                "email": "head@dvfu.ru",
                "password_hash": hash_password("teacher123"),
                "role": "head_of_department" if not APP_IMPORTS_AVAILABLE else UserRole.HEAD_OF_DEPARTMENT,
                "department": "Информатика и вычислительная техника",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Преподаватель Тестовый",
                "email": "teacher@dvfu.ru",
                "password_hash": hash_password("teacher123"),
                "role": "teacher" if not APP_IMPORTS_AVAILABLE else UserRole.TEACHER,
                "department": "Информатика и вычислительная техника",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Студент Тестовый",
                "email": "student@dvfu.ru",
                "password_hash": hash_password("student123"),
                "role": "student" if not APP_IMPORTS_AVAILABLE else UserRole.STUDENT,
                "group": group_names[0],
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]
        
        user_ids = []
        for user in default_users:
            result = users_collection.insert_one(user)
            user_ids.append(result.inserted_id)
            logger.info(f"Создан пользователь: {user['name']} ({user['email']})")
        
        # Получаем ID тестового преподавателя
        test_teacher = users_collection.find_one({"email": "teacher@dvfu.ru"})
        test_teacher_id = test_teacher["_id"] if test_teacher else None
        
        # Генерируем преподавателей (10% от общего числа)
        teacher_count = max(int(count * 0.1), 5)  # минимум 5 преподавателей
        logger.info(f"Генерация {teacher_count} преподавателей...")
        
        teachers = []
        for i in range(teacher_count):
            first_name, last_name, gender = generate_random_name()
            full_name = f"{last_name} {first_name}"
            email = generate_email(first_name, last_name)
            department = random.choice(DEPARTMENT_NAMES)
            
            teacher = {
                "name": full_name,
                "email": email,
                "password_hash": hash_password("teacher123"),
                "role": "teacher" if not APP_IMPORTS_AVAILABLE else UserRole.TEACHER,
                "department": department,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = users_collection.insert_one(teacher)
            teachers.append({"id": result.inserted_id, "data": teacher})
            logger.info(f"Создан преподаватель: {full_name} ({email})")
        
        # Генерируем дисциплины для преподавателей
        logger.info("Генерация учебных дисциплин...")
        disciplines = []
        
        # Сначала назначаем дисциплины тестовому преподавателю
        if test_teacher_id:
            logger.info("Назначение дисциплин тестовому преподавателю...")
            
            # Создаем 5 дисциплин для тестового преподавателя
            for i in range(5):
                subject_name = SUBJECT_NAMES[i]
                semester = random.randint(1, 2)
                
                # Выбираем несколько групп для дисциплины
                discipline_groups = random.sample(groups, random.randint(1, 3))
                group_ids = [str(g["id"]) for g in discipline_groups]
                
                discipline = {
                    "name": subject_name,
                    "teacher": test_teacher_id,
                    "semester": semester,
                    "groups": group_ids,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                result = disciplines_collection.insert_one(discipline)
                disciplines.append({"id": result.inserted_id, "data": discipline})
                logger.info(f"Создана дисциплина: {subject_name} (преподаватель: test)")
        
        # Затем генерируем дисциплины для остальных преподавателей
        for teacher in teachers:
            # Для каждого преподавателя генерируем 2-4 дисциплины
            num_disciplines = random.randint(2, 4)
            
            for _ in range(num_disciplines):
                subject_name = random.choice(SUBJECT_NAMES)
                semester = random.randint(1, 2)
                
                # Выбираем несколько групп для дисциплины
                discipline_groups = random.sample(groups, random.randint(1, 3))
                group_ids = [str(g["id"]) for g in discipline_groups]
                
                discipline = {
                    "name": subject_name,
                    "teacher": teacher["id"],
                    "semester": semester,
                    "groups": group_ids,
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                result = disciplines_collection.insert_one(discipline)
                disciplines.append({"id": result.inserted_id, "data": discipline})
                logger.info(f"Создана дисциплина: {subject_name} (преподаватель: {teacher['data']['name']})")
        
        # Генерируем студентов
        student_count = count - teacher_count
        logger.info(f"Генерация {student_count} студентов...")
        
        students = []
        for i in range(student_count):
            first_name, last_name, gender = generate_random_name()
            full_name = f"{last_name} {first_name}"
            email = generate_email(first_name, last_name)
            
            # Выбираем случайную группу
            group = random.choice(groups)
            group_name = group["data"]["name"]
            
            student = {
                "name": full_name,
                "email": email,
                "password_hash": hash_password("student123"),
                "role": "student" if not APP_IMPORTS_AVAILABLE else UserRole.STUDENT,
                "group": group_name,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = users_collection.insert_one(student)
            students.append({"id": result.inserted_id, "data": student})
            if i % 10 == 0:
                logger.info(f"Создано студентов: {i+1}/{student_count}")
        
        logger.info("Предопределенные учетные данные для входа:")
        logger.info(" - Администратор: admin@dvfu.ru / admin123")
        logger.info(" - Заведующий кафедрой: head@dvfu.ru / teacher123")
        logger.info(" - Преподаватель: teacher@dvfu.ru / teacher123")
        logger.info(" - Студент: student@dvfu.ru / student123")
        logger.info(f"\nВсего создано:")
        logger.info(f" - Групп: {len(groups)}")
        logger.info(f" - Предопределенных пользователей: {len(default_users)}")
        logger.info(f" - Преподавателей: {teacher_count}")
        logger.info(f" - Студентов: {student_count}")
        logger.info(f" - Дисциплин: {len(disciplines)}")
        
        # Генерация оценок
        generate_test_grades()
        
    except Exception as e:
        logger.error(f"Ошибка при заполнении базы данных: {str(e)}")
        import traceback
        logger.error(traceback.format_exc())

def generate_test_grades():
    """
    Генерирует тестовые оценки для студентов с улучшенной структурой,
    совместимой с компонентом журнала оценок GradeJournal.tsx
    """
    logger.info("Генерация тестовых оценок...")
    
    # Находим тестового студента
    test_student = users_collection.find_one({"email": "student@dvfu.ru"})
    if not test_student:
        logger.error("Тестовый студент не найден. Невозможно сгенерировать оценки.")
        return
    
    test_student_id = test_student["_id"]
    logger.info(f"Найден тестовый студент: {test_student['name']} (ID: {test_student_id})")
    
    # Удаляем все существующие оценки для тестового студента
    result = grades_collection.delete_many({"student_id": str(test_student_id)})
    logger.info(f"Удалено {result.deleted_count} старых оценок для тестового студента")
    
    # Находим все дисциплины
    all_disciplines = list(disciplines_collection.find())
    
    if not all_disciplines:
        logger.error("Дисциплины не найдены. Невозможно сгенерировать оценки.")
        return
    
    logger.info(f"Найдено {len(all_disciplines)} дисциплин")
    
    # Обновляем формат дисциплин для совместимости с журналом
    for discipline in all_disciplines:
        # Добавляем поле discipline_id для совместимости с журналом
        if "_id" in discipline and "discipline_id" not in discipline:
            disciplines_collection.update_one(
                {"_id": discipline["_id"]},
                {"$set": {
                    "discipline_id": str(discipline["_id"]),
                    "discipline_name": discipline.get("name", "Неизвестная дисциплина")
                }}
            )
            logger.info(f"Обновлена структура дисциплины: {discipline.get('name', 'Неизвестная дисциплина')}")
    
    # Обновляем дисциплины после изменений
    all_disciplines = list(disciplines_collection.find())
    
    # Генерируем даты для оценок (за последние 3 месяца)
    today = datetime.now()
    start_date = today - timedelta(days=90)
    
    # Типы оценок в соответствии с интерфейсом GradeItem из журнала
    grade_types = ["Экзамен", "Тест", "Домашняя работа", "Проект", "Активность", "Опрос", "Лабораторная"]
    
    # Для тестового студента создаем оценки по всем дисциплинам
    total_grades = 0
    
    # Для каждой дисциплины генерируем оценки
    for discipline in all_disciplines:
        discipline_id = discipline.get("discipline_id", str(discipline["_id"]))
        discipline_name = discipline.get("discipline_name", discipline.get("name", "Неизвестная дисциплина"))
        
        # Находим преподавателя дисциплины
        teacher_id = discipline.get("teacher")
        if not teacher_id:
            teacher = users_collection.find_one({"role": "teacher"})
            teacher_id = teacher["_id"] if teacher else None
        
        # Количество оценок варьируется для разных дисциплин
        num_grades = random.randint(5, 15)
        logger.info(f"Генерация {num_grades} оценок для дисциплины '{discipline_name}'")
        
        # Собираем оценки по этой дисциплине для вычисления средней оценки
        discipline_grades = []
        
        for i in range(num_grades):
            # Генерируем случайную дату в диапазоне последних 3 месяцев
            random_days = random.randint(0, 90)
            grade_date = start_date + timedelta(days=random_days)
            grade_date_str = grade_date.strftime('%Y-%m-%d')  # Формат даты, ожидаемый журналом
            
            # Для первой дисциплины добавляем оценки всех типов для лучшей визуализации аналитики
            if all_disciplines.index(discipline) == 0:
                # Для разнообразия анализа добавляем оценки от 1 до 5
                values = [1, 2, 3, 4, 5]
                value = values[i % len(values)]
                grade_type = grade_types[i % len(grade_types)]
            else:
                # Для остальных дисциплин генерируем случайные оценки
                # С небольшим перекосом в сторону хороших оценок
                value = random.choices([1, 2, 3, 4, 5], weights=[1, 1, 3, 4, 3])[0]
                grade_type = random.choice(grade_types)
            
            # Создаем оценку в формате, совместимом с интерфейсом GradeItem
            grade = {
                "student_id": str(test_student_id),
                "discipline_id": discipline_id,
                "discipline_name": discipline_name,
                "value": str(value),  # Преобразуем в строку для совместимости с GradeItem.value
                "type": grade_type,
                "description": f"Оценка за {grade_type.lower()}",
                "date": grade_date_str,
                "weight": random.choice([0.5, 1.0, 1.5, 2.0]),  # Разные веса оценок для реалистичности
                "created_at": datetime.utcnow(),
                "created_by": str(teacher_id) if teacher_id else None
            }
            
            result = grades_collection.insert_one(grade)
            # Добавляем id в формате, ожидаемом GradeItem
            grades_collection.update_one(
                {"_id": result.inserted_id},
                {"$set": {"id": str(result.inserted_id)}}
            )
            
            discipline_grades.append(value)
            total_grades += 1
        
        # Вычисляем и обновляем среднюю оценку для дисциплины
        if discipline_grades:
            average_grade = sum(discipline_grades) / len(discipline_grades)
            disciplines_collection.update_one(
                {"_id": discipline["_id"]},
                {"$set": {"average_grade": average_grade}}
            )
            logger.info(f"Обновлена средняя оценка для дисциплины '{discipline_name}': {average_grade:.2f}")
    
    logger.info(f"Сгенерировано {total_grades} оценок для тестового студента")
    
    # Генерируем оценки для других студентов для более полной аналитики
    other_students = list(users_collection.find({"role": "student", "_id": {"$ne": test_student_id}}).limit(10))
    
    for student in other_students:
        student_id = student["_id"]
        student_name = student.get("name", "Неизвестный студент")
        
        # Для каждого студента генерируем оценки по нескольким дисциплинам
        selected_disciplines = random.sample(all_disciplines, min(4, len(all_disciplines)))
        student_grades = 0
        
        for discipline in selected_disciplines:
            discipline_id = discipline.get("discipline_id", str(discipline["_id"]))
            discipline_name = discipline.get("discipline_name", discipline.get("name", "Неизвестная дисциплина"))
            
            # Преподаватель дисциплины
            teacher_id = discipline.get("teacher")
            if not teacher_id:
                teacher = users_collection.find_one({"role": "teacher"})
                teacher_id = teacher["_id"] if teacher else None
            
            # От 3 до 8 оценок по каждой дисциплине
            num_grades = random.randint(3, 8)
            
            for _ in range(num_grades):
                # Генерируем случайную дату
                random_days = random.randint(0, 90)
                grade_date = start_date + timedelta(days=random_days)
                grade_date_str = grade_date.strftime('%Y-%m-%d')
                
                # Для них тоже генерируем разные оценки
                value = random.choices([1, 2, 3, 4, 5], weights=[1, 2, 3, 4, 2])[0]
                grade_type = random.choice(grade_types)
                
                grade = {
                    "student_id": str(student_id),
                    "discipline_id": discipline_id,
                    "discipline_name": discipline_name,
                    "value": str(value),
                    "type": grade_type,
                    "description": f"Оценка за {grade_type.lower()}",
                    "date": grade_date_str,
                    "weight": random.choice([0.5, 1.0, 1.5, 2.0]),
                    "created_at": datetime.utcnow(),
                    "created_by": str(teacher_id) if teacher_id else None
                }
                
                result = grades_collection.insert_one(grade)
                # Добавляем id в формате, ожидаемом GradeItem
                grades_collection.update_one(
                    {"_id": result.inserted_id},
                    {"$set": {"id": str(result.inserted_id)}}
                )
                
                student_grades += 1
        
        logger.info(f"Сгенерировано {student_grades} оценок для студента {student_name}")
        total_grades += student_grades
    
    logger.info(f"Всего сгенерировано {total_grades} оценок")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Генерация тестовых данных для системы КПиУС')
    parser.add_argument('--count', type=int, default=100, help='Общее количество пользователей (включая предопределенных)')
    parser.add_argument('--clear', action='store_true', help='Очистить базу данных перед заполнением')
    parser.add_argument('--grades-only', action='store_true', help='Сгенерировать только оценки')
    
    args = parser.parse_args()
    
    try:
        if args.grades_only:
            # Подключаемся к базе данных и генерируем только оценки
            db, users_collection, groups_collection, disciplines_collection, grades_collection = connect_db()
            generate_test_grades()
        else:
            # Генерируем все тестовые данные
            create_test_data(count=args.count, clear_db=args.clear)
            
        logger.info("Генерация тестовых данных успешно завершена")
    except Exception as e:
        logger.error(f"Ошибка при генерации тестовых данных: {str(e)}")
        import traceback
        logger.error(traceback.format_exc()) 