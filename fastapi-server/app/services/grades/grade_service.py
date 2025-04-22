"""
Сервис для работы с оценками студентов.
"""
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional
from bson import ObjectId

from ...core.database import db, users_collection, disciplines_collection
from ...models.user import UserRole

# Настройка логирования
logger = logging.getLogger(__name__)

# Коллекция оценок в MongoDB
grades_collection = db["grades"]

class GradeService:
    """
    Сервис для работы с оценками студентов.
    Предоставляет методы для добавления, получения и удаления оценок.
    """
    
    @staticmethod
    async def add_grade(
        student_id: str,
        discipline_id: str,
        grade_value: int,
        grade_type: str,
        description: Optional[str] = None,
        weight: float = 1.0,
        date: Optional[str] = None,
        created_by: str = None
    ) -> Dict[str, Any]:
        """
        Добавление новой оценки для студента
        
        Args:
            student_id: ID студента
            discipline_id: ID дисциплины
            grade_value: Значение оценки (1-5)
            grade_type: Тип оценки (exam, test, homework, project, activity)
            description: Описание оценки
            weight: Вес оценки
            date: Дата оценки в формате ISO
            created_by: ID пользователя, добавившего оценку
            
        Returns:
            Dict: Данные добавленной оценки
            
        Raises:
            ValueError: Если данные некорректны
        """
        # Проверяем существование дисциплины
        discipline = await disciplines_collection.find_one({"_id": ObjectId(discipline_id)})
        if not discipline:
            raise ValueError(f"Дисциплина с ID {discipline_id} не найдена")
        
        # Проверяем существование студента
        student = await users_collection.find_one({"_id": ObjectId(student_id), "role": UserRole.STUDENT})
        if not student:
            raise ValueError(f"Студент с ID {student_id} не найден")
        
        # Проверяем, что оценка в допустимом диапазоне (1-5)
        if grade_value < 1 or grade_value > 5:
            raise ValueError("Оценка должна быть в диапазоне от 1 до 5")
        
        # Проверяем тип оценки
        valid_types = ["exam", "test", "homework", "project", "activity"]
        if grade_type not in valid_types:
            raise ValueError(f"Неверный тип оценки. Допустимые типы: {', '.join(valid_types)}")
        
        # Преобразуем строку даты в объект datetime, если она указана
        grade_date = None
        if date:
            try:
                grade_date = datetime.fromisoformat(date)
            except ValueError:
                raise ValueError("Неверный формат даты. Используйте формат ISO (YYYY-MM-DDTHH:MM:SS)")
        else:
            grade_date = datetime.utcnow()
        
        # Создаем запись оценки
        grade = {
            "student_id": student_id,
            "discipline_id": discipline_id,
            "value": grade_value,
            "type": grade_type,
            "description": description or f"Оценка за {grade_type}",
            "date": grade_date,
            "weight": weight,
            "created_at": datetime.utcnow(),
            "created_by": created_by
        }
        
        result = await grades_collection.insert_one(grade)
        
        logger.info(f"Оценка успешно добавлена: {result.inserted_id}")
        return {"id": str(result.inserted_id), "message": "Оценка успешно добавлена"}
    
    @staticmethod
    async def get_student_grades(student_id: str) -> List[Dict[str, Any]]:
        """
        Получение всех оценок студента
        
        Args:
            student_id: ID студента
            
        Returns:
            List[Dict]: Список оценок с информацией о дисциплинах
        """
        logger.info(f"Получение оценок для студента: {student_id}")
        
        # Получаем все оценки для студента
        cursor = grades_collection.find({"student_id": student_id})
        grades = await cursor.to_list(length=100)
        
        # Получаем информацию о дисциплинах для каждой оценки
        result = []
        for grade in grades:
            grade["_id"] = str(grade["_id"])
            
            # Получаем название дисциплины
            discipline = await disciplines_collection.find_one({"_id": ObjectId(grade["discipline_id"])})
            if discipline:
                grade["discipline_name"] = discipline["name"]
            
            # Конвертируем дату в строку ISO
            if "date" in grade:
                grade["date"] = grade["date"].isoformat()
            
            result.append(grade)
        
        # Сортируем по дате (сначала новые)
        result.sort(key=lambda x: x.get("date", ""), reverse=True)
        
        logger.info(f"Найдено {len(result)} оценок для студента {student_id}")
        return result
    
    @staticmethod
    async def get_student_grades_by_discipline(student_id: str, discipline_id: str) -> List[Dict[str, Any]]:
        """
        Получение оценок студента по конкретной дисциплине
        
        Args:
            student_id: ID студента
            discipline_id: ID дисциплины
            
        Returns:
            List[Dict]: Список оценок по указанной дисциплине
            
        Raises:
            ValueError: Если дисциплина не найдена
        """
        # Проверяем существование дисциплины
        discipline = await disciplines_collection.find_one({"_id": ObjectId(discipline_id)})
        if not discipline:
            raise ValueError(f"Дисциплина с ID {discipline_id} не найдена")
        
        logger.info(f"Получение оценок для студента {student_id} по дисциплине {discipline_id}")
        
        # Получаем оценки по дисциплине
        cursor = grades_collection.find({
            "student_id": student_id,
            "discipline_id": discipline_id
        })
        grades = await cursor.to_list(length=100)
        
        # Форматируем результат
        result = []
        for grade in grades:
            grade["_id"] = str(grade["_id"])
            grade["discipline_name"] = discipline["name"]
            
            # Конвертируем дату в строку ISO
            if "date" in grade:
                grade["date"] = grade["date"].isoformat()
            
            result.append(grade)
        
        # Сортируем по дате (сначала новые)
        result.sort(key=lambda x: x.get("date", ""), reverse=True)
        
        logger.info(f"Найдено {len(result)} оценок для студента {student_id} по дисциплине {discipline_id}")
        return result
    
    @staticmethod
    async def get_student_grade_summary(student_id: str) -> Dict[str, Any]:
        """
        Получение сводки оценок студента
        
        Args:
            student_id: ID студента
            
        Returns:
            Dict: Сводка оценок студента по дисциплинам
        """
        logger.info(f"Получение сводки оценок для студента: {student_id}")
        
        # Получаем все оценки для студента
        cursor = grades_collection.find({"student_id": student_id})
        grades = await cursor.to_list(length=100)
        
        if not grades:
            return {
                "message": "У студента нет оценок",
                "disciplines": [],
                "overall_average": 0,
                "grade_distribution": {
                    "1": 0, "2": 0, "3": 0, "4": 0, "5": 0
                }
            }
        
        # Форматируем для удобства анализа
        formatted_grades = []
        discipline_ids = set()
        
        for grade in grades:
            discipline_ids.add(grade["discipline_id"])
            formatted_grades.append({
                "discipline_id": grade["discipline_id"],
                "value": grade["value"],
                "type": grade["type"],
                "weight": grade.get("weight", 1.0),
                "date": grade.get("date", datetime.utcnow()),
            })
        
        # Получаем информацию о дисциплинах
        disciplines_summary = []
        for discipline_id in discipline_ids:
            discipline = await disciplines_collection.find_one({"_id": ObjectId(discipline_id)})
            if not discipline:
                continue
                
            # Фильтруем оценки по текущей дисциплине
            discipline_grades = [g for g in formatted_grades if g["discipline_id"] == discipline_id]
            
            # Считаем среднюю оценку с учетом весов
            total_weight = sum(g["weight"] for g in discipline_grades)
            weighted_sum = sum(g["value"] * g["weight"] for g in discipline_grades)
            average_grade = round(weighted_sum / total_weight, 2) if total_weight > 0 else 0
            
            # Считаем распределение оценок
            grade_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            for g in discipline_grades:
                grade_counts[g["value"]] += 1
            
            # Добавляем в сводку
            disciplines_summary.append({
                "discipline_id": discipline_id,
                "discipline_name": discipline.get("name", "Неизвестная дисциплина"),
                "average_grade": average_grade,
                "grade_count": len(discipline_grades),
                "grade_distribution": grade_counts
            })
        
        # Общая средняя оценка
        all_grades = [g["value"] for g in formatted_grades]
        overall_average = round(sum(all_grades) / len(all_grades), 2) if all_grades else 0
        
        # Общее распределение оценок
        overall_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for g in formatted_grades:
            overall_distribution[g["value"]] += 1
        
        result = {
            "student_id": student_id,
            "disciplines": disciplines_summary,
            "overall_average": overall_average,
            "grade_distribution": overall_distribution,
            "total_grade_count": len(formatted_grades)
        }
        
        logger.info(f"Сформирована сводка оценок для студента {student_id}: {len(disciplines_summary)} дисциплин")
        return result
    
    @staticmethod
    async def get_discipline_grades(discipline_id: str) -> List[Dict[str, Any]]:
        """
        Получение всех оценок по конкретной дисциплине
        
        Args:
            discipline_id: ID дисциплины
            
        Returns:
            List[Dict]: Список оценок с информацией о студентах
            
        Raises:
            ValueError: Если дисциплина не найдена
        """
        # Проверяем существование дисциплины
        discipline = await disciplines_collection.find_one({"_id": ObjectId(discipline_id)})
        if not discipline:
            raise ValueError(f"Дисциплина с ID {discipline_id} не найдена")
        
        logger.info(f"Получение всех оценок по дисциплине: {discipline_id}")
        
        # Получаем все оценки для дисциплины
        cursor = grades_collection.find({"discipline_id": discipline_id})
        grades = await cursor.to_list(length=100)
        
        # Получаем информацию о студентах для каждой оценки
        result = []
        for grade in grades:
            grade["_id"] = str(grade["_id"])
            grade["discipline_name"] = discipline["name"]
            
            # Получаем информацию о студенте
            student = await users_collection.find_one({"_id": ObjectId(grade["student_id"])})
            if student:
                grade["student_name"] = f"{student.get('last_name', '')} {student.get('first_name', '')} {student.get('middle_name', '')}".strip()
                grade["student_email"] = student.get("email", "")
                grade["student_group"] = student.get("group", "")
            
            # Конвертируем дату в строку ISO
            if "date" in grade:
                grade["date"] = grade["date"].isoformat()
            
            result.append(grade)
        
        # Сортируем по дате и имени студента
        result.sort(key=lambda x: (x.get("date", ""), x.get("student_name", "")), reverse=True)
        
        logger.info(f"Найдено {len(result)} оценок по дисциплине {discipline_id}")
        return result 