#!/usr/bin/env python3
"""
Скрипт для генерации большого количества тестовых пользователей
"""

import logging
import random
from app.core.database import db, users_collection, groups_collection, disciplines_collection
from app.models.user import UserRole
from app.core.security import get_password_hash
from datetime import datetime
from bson import ObjectId

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

def create_users(count=100, clear_db=False):
    """Генерирует указанное количество случайных пользователей"""
    try:
        if clear_db:
            # Очистка коллекций
            logger.info("Очистка существующих данных...")
            users_collection.delete_many({})
            groups_collection.delete_many({})
            disciplines_collection.delete_many({})
        
        # Создаем 5 групп на разных специализациях и курсах
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
                "password_hash": get_password_hash("admin123"),
                "role": UserRole.ADMIN,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Заведующий Кафедрой",
                "email": "head@dvfu.ru",
                "password_hash": get_password_hash("teacher123"),
                "role": UserRole.HEAD_OF_DEPARTMENT,
                "department": "Информатика и вычислительная техника",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Преподаватель Тестовый",
                "email": "teacher@dvfu.ru",
                "password_hash": get_password_hash("teacher123"),
                "role": UserRole.TEACHER,
                "department": "Информатика и вычислительная техника",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "name": "Студент Тестовый",
                "email": "student@dvfu.ru",
                "password_hash": get_password_hash("student123"),
                "role": UserRole.STUDENT,
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
                "password_hash": get_password_hash("teacher123"),
                "role": UserRole.TEACHER,
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
            
            # Получаем группу тестового студента
            test_student = users_collection.find_one({"email": "student@dvfu.ru"})
            test_student_group_name = test_student["group"] if test_student else group_names[0]
            logger.info(f"Группа тестового студента: {test_student_group_name}")
            
            # Находим группу по имени
            test_student_group = groups_collection.find_one({"name": test_student_group_name})
            if not test_student_group:
                logger.warning(f"Группа {test_student_group_name} не найдена!")
            else:
                logger.info(f"ID группы студента: {test_student_group['_id']}")
                
                # Первая дисциплина обязательно для группы тестового студента
                subject_name = SUBJECT_NAMES[0]
                semester = random.randint(1, 8)
                
                discipline = {
                    "name": subject_name,
                    "teacher": test_teacher_id,
                    "semester": semester,
                    "groups": [test_student_group["_id"]],  # Назначаем только группу тестового студента
                    "department": "Информатика и вычислительная техника",
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                result = disciplines_collection.insert_one(discipline)
                disciplines.append({"id": result.inserted_id, "data": discipline})
                logger.info(f"Создана дисциплина для тестового преподавателя и группы тестового студента: {subject_name}")
            
            # Добавляем еще дисциплины с другими группами
            for i in range(1, 3):
                subject_name = SUBJECT_NAMES[i]
                # Назначаем по 2 случайные группы для остальных дисциплин
                subject_groups = random.sample(groups, 2)
                semester = random.randint(1, 8)
                
                discipline = {
                    "name": subject_name,
                    "teacher": test_teacher_id,
                    "semester": semester,
                    "groups": [group["id"] for group in subject_groups],
                    "department": "Информатика и вычислительная техника",
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                result = disciplines_collection.insert_one(discipline)
                disciplines.append({"id": result.inserted_id, "data": discipline})
                logger.info(f"Создана дисциплина для тестового преподавателя: {subject_name}")
        
        # Затем назначаем дисциплины случайным преподавателям
        for teacher in teachers:
            # Каждый преподаватель ведет от 1 до 3 дисциплин
            for _ in range(random.randint(1, 3)):
                subject_name = random.choice(SUBJECT_NAMES)
                # Выбираем случайные группы (от 1 до 3) для дисциплины
                subject_groups = random.sample(groups, random.randint(1, 3))
                semester = random.randint(1, 8)
                
                discipline = {
                    "name": subject_name,
                    "teacher": teacher["id"],
                    "semester": semester,
                    "groups": [group["id"] for group in subject_groups],
                    "department": teacher["data"]["department"],
                    "created_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
                
                result = disciplines_collection.insert_one(discipline)
                disciplines.append({"id": result.inserted_id, "data": discipline})
                logger.info(f"Создана дисциплина: {subject_name} (преподаватель: {teacher['data']['name']})")
        
        # Генерируем студентов
        student_count = count - teacher_count - len(default_users)
        logger.info(f"Генерация {student_count} студентов...")
        
        for i in range(student_count):
            first_name, last_name, gender = generate_random_name()
            full_name = f"{last_name} {first_name}"
            email = generate_email(first_name, last_name)
            group = random.choice(group_names)
            
            student = {
                "name": full_name,
                "email": email,
                "password_hash": get_password_hash("student123"),
                "role": UserRole.STUDENT,
                "group": group,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
            
            result = users_collection.insert_one(student)
            if i % 10 == 0:  # Логируем каждого 10-го студента для уменьшения вывода
                logger.info(f"Создан студент #{i+1}: {full_name} (группа: {group})")
        
        logger.info("\nБаза данных успешно заполнена тестовыми пользователями.")
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
        
    except Exception as e:
        logger.error(f"Ошибка при заполнении базы данных: {str(e)}")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Генерация тестовых пользователей для системы')
    parser.add_argument('--count', type=int, default=100, help='Общее количество пользователей (включая предопределенных)')
    parser.add_argument('--clear', action='store_true', help='Очистить базу данных перед заполнением')
    
    args = parser.parse_args()
    
    create_users(count=args.count, clear_db=args.clear) 