"""
Сервис для аналитики оценок студентов.
"""
import logging
import numpy as np
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from bson import ObjectId

from ...core.database import db, disciplines_collection
from .grade_service import grades_collection

# Настройка логирования
logger = logging.getLogger(__name__)

class GradeAnalyticsService:
    """
    Сервис для аналитики оценок студентов.
    Предоставляет методы для расчета статистики, трендов и прогнозов.
    """
    
    @staticmethod
    def simple_linear_regression(X: np.ndarray, y: np.ndarray) -> Tuple[callable, float, float]:
        """
        Простая реализация линейной регрессии без использования sklearn
        
        Args:
            X: Массив признаков
            y: Массив целевых значений
            
        Returns:
            Tuple: (функция предсказания, коэффициент наклона, свободный член)
        """
        n = len(X)
        mean_x = np.mean(X)
        mean_y = np.mean(y)
        
        # Рассчитываем наклон (slope)
        numer = 0
        denom = 0
        for i in range(n):
            numer += (X[i] - mean_x) * (y[i] - mean_y)
            denom += (X[i] - mean_x) ** 2
        
        slope = numer / denom if denom != 0 else 0
        
        # Рассчитываем пересечение (intercept)
        intercept = mean_y - (slope * mean_x)
        
        # Предсказываем значения
        def predict(X_new):
            return intercept + slope * X_new
        
        return predict, slope, intercept
    
    @staticmethod
    async def calculate_expulsion_probability(student_id: str) -> Dict[str, Any]:
        """
        Расчет вероятности отчисления студента на основе его оценок и активности
        
        Args:
            student_id: ID студента
            
        Returns:
            Dict: Вероятность отчисления и факторы риска
        """
        logger.info(f"Расчет вероятности отчисления для студента: {student_id}")
        
        # Получаем оценки студента
        try:
            student_id_obj = ObjectId(student_id)
            grades = list(grades_collection.find({"student_id": student_id_obj}))
            logger.debug(f"Получено {len(grades)} оценок для анализа риска отчисления")
        except Exception as e:
            logger.error(f"Ошибка при получении оценок для анализа риска отчисления: {str(e)}")
            grades = []
        
        # Если нет оценок, возвращаем нулевую вероятность
        if not grades:
            logger.info(f"У студента {student_id} нет оценок для расчета вероятности отчисления")
            return {
                "probability": 0,
                "message": "Недостаточно данных для расчета вероятности отчисления",
                "risk_factors": [],
                "trend": "stable"
            }
        
        # Получаем посещаемость студента
        attendance_records = list(db.attendance.find({"student_id": student_id}))
        
        # Расчет среднего балла
        average_grade = sum(grade["value"] for grade in grades) / len(grades)
        
        # Расчет посещаемости
        if attendance_records:
            attendance_rate = sum(1 for record in attendance_records if record.get("status") == "present") / len(attendance_records)
        else:
            attendance_rate = 1.0  # Если нет данных о посещаемости, предполагаем 100%
        
        # Базовая вероятность отчисления на основе среднего балла
        # Используем логистическую функцию для плавного перехода
        # Средний балл 3.0 дает вероятность около 0.5
        base_probability = 1 / (1 + np.exp((average_grade - 3) * 2))
        
        # Корректируем на основе посещаемости
        # Пропуск более 30% занятий значительно увеличивает вероятность отчисления
        attendance_factor = 1 + max(0, (0.7 - attendance_rate) * 2)
        
        # Итоговая вероятность
        probability = min(0.95, base_probability * attendance_factor)
        
        # Анализ тренда
        # Разделим оценки на более ранние и более поздние
        trend = "stable"
        if len(grades) >= 6:
            grades_with_dates = [(g["value"], g.get("date", datetime.utcnow())) for g in grades]
            grades_with_dates.sort(key=lambda x: x[1])
            
            half_point = len(grades_with_dates) // 2
            earlier_grades = [g[0] for g in grades_with_dates[:half_point]]
            later_grades = [g[0] for g in grades_with_dates[half_point:]]
            
            earlier_avg = sum(earlier_grades) / len(earlier_grades)
            later_avg = sum(later_grades) / len(later_grades)
            
            if later_avg - earlier_avg > 0.3:
                trend = "improving"
            elif earlier_avg - later_avg > 0.3:
                trend = "declining"
            else:
                trend = "stable"
                
            # Более детальный анализ тренда через линейную регрессию
            if len(grades) >= 10:
                # Создаем данные для регрессии
                x = np.array(range(len(grades_with_dates))).reshape(-1, 1)
                y = np.array([g[0] for g in grades_with_dates])
                
                # Обучаем модель
                model = GradeAnalyticsService.simple_linear_regression(x, y)
                
                # Если коэффициент наклона отрицательный и значительный, 
                # то тренд снижающийся
                slope = model[1]
                if slope < -0.05:
                    trend = "rapidly_declining"
                elif slope > 0.05:
                    trend = "rapidly_improving"
        else:
            trend = "insufficient_data"
        
        # Определение факторов риска
        risk_factors = []
        if average_grade < 3.0:
            risk_factors.append("Низкий средний балл")
        
        if attendance_rate < 0.7:
            risk_factors.append("Низкая посещаемость")
        
        if trend in ["declining", "rapidly_declining"]:
            risk_factors.append("Негативный тренд успеваемости")
        
        # Результат
        result = {
            "student_id": student_id,
            "probability": round(probability, 2),
            "average_grade": round(average_grade, 2),
            "attendance_rate": round(attendance_rate, 2),
            "risk_factors": risk_factors,
            "trend": trend,
            "message": "Расчет основан на среднем балле и посещаемости"
        }
        
        logger.info(f"Вероятность отчисления рассчитана для студента {student_id}: {result['probability']}")
        return result
    
    @staticmethod
    def convert_objectid(item):
        """
        Рекурсивно преобразует все ObjectId в строки в словаре или списке
        """
        if isinstance(item, dict):
            return {k: GradeAnalyticsService.convert_objectid(v) for k, v in item.items()}
        elif isinstance(item, list):
            return [GradeAnalyticsService.convert_objectid(i) for i in item]
        elif isinstance(item, ObjectId):
            return str(item)
        elif hasattr(item, '_id') and isinstance(item._id, ObjectId):
            item_dict = dict(item)
            item_dict['_id'] = str(item_dict['_id'])
            return item_dict
        else:
            return item

    @staticmethod
    async def get_student_grade_analytics(student_id: str) -> Dict[str, Any]:
        """
        Получение подробной аналитики по оценкам студента
        
        Args:
            student_id: ID студента
            
        Returns:
            Dict: Полная аналитика оценок студента
        """
        logger.info(f"Получение аналитики оценок для студента: {student_id}")
        
        # Получаем все оценки для студента
        # Преобразуем строковый ID в ObjectId для корректного поиска в MongoDB
        try:
            student_id_obj = ObjectId(student_id)
            # Используем синхронный метод find с list для преобразования курсора в список
            grades = list(grades_collection.find({"student_id": student_id_obj}))
            logger.debug(f"Получено {len(grades)} оценок")
        except Exception as e:
            logger.error(f"Ошибка при поиске оценок студента {student_id}: {str(e)}")
            grades = []
        
        if not grades:
            logger.info(f"У студента {student_id} нет оценок")
            return {
                "message": "У студента нет оценок для анализа",
                "disciplines": [],
                "overall_stats": {
                    "average": 0,
                    "count": 0,
                    "distribution": {
                        "1": 0, "2": 0, "3": 0, "4": 0, "5": 0
                    }
                },
                "recent_grades": []
            }
        
        # Форматируем для удобства анализа
        formatted_grades = []
        discipline_ids = set()
        
        for grade in grades:
            discipline_ids.add(grade["discipline_id"])
            formatted_grades.append({
                "id": str(grade["_id"]),
                "discipline_id": grade["discipline_id"],
                "value": grade["value"],
                "type": grade["type"],
                "weight": grade.get("weight", 1.0),
                "date": grade.get("date", datetime.utcnow()),
                "description": grade.get("description", "")
            })
        
        logger.debug(f"Найдено {len(discipline_ids)} уникальных дисциплин")
        
        # Получаем информацию о дисциплинах
        disciplines_data = {}
        for discipline_id in discipline_ids:
            try:
                # Здесь также используем синхронный вариант
                discipline = disciplines_collection.find_one({"_id": ObjectId(discipline_id)})
                if discipline:
                    disciplines_data[discipline_id] = {
                        "id": discipline_id,
                        "name": discipline.get("name", "Неизвестная дисциплина")
                    }
                    logger.debug(f"Найдена дисциплина: {discipline.get('name', 'Неизвестная')}")
            except Exception as e:
                logger.error(f"Ошибка при получении дисциплины {discipline_id}: {str(e)}")
                # Продолжаем работу с другими дисциплинами
        
        # Анализируем оценки по типам
        grade_types = ["exam", "test", "homework", "project", "activity"]
        type_averages = {}
        for grade_type in grade_types:
            type_grades = [g["value"] for g in formatted_grades if g["type"] == grade_type]
            if type_grades:
                type_averages[grade_type] = round(sum(type_grades) / len(type_grades), 2)
            else:
                type_averages[grade_type] = 0
        
        # Анализируем оценки по дисциплинам
        discipline_analytics = []
        for discipline_id, discipline_info in disciplines_data.items():
            discipline_grades = [g for g in formatted_grades if g["discipline_id"] == discipline_id]
            
            if not discipline_grades:
                continue
                
            # Средняя оценка по дисциплине
            avg_grade = round(sum(g["value"] for g in discipline_grades) / len(discipline_grades), 2)
            
            # Распределение оценок
            grade_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
            for g in discipline_grades:
                grade_counts[g["value"]] += 1
            
            # Анализ оценок по типам для этой дисциплины
            discipline_type_averages = {}
            for grade_type in grade_types:
                type_grades = [g["value"] for g in discipline_grades if g["type"] == grade_type]
                if type_grades:
                    discipline_type_averages[grade_type] = round(sum(type_grades) / len(type_grades), 2)
                else:
                    discipline_type_averages[grade_type] = 0
            
            # Формируем аналитику по дисциплине
            discipline_analytics.append({
                "discipline_id": discipline_id,
                "discipline_name": discipline_info["name"],
                "average_grade": avg_grade,
                "grade_count": len(discipline_grades),
                "grade_distribution": grade_counts,
                "type_averages": discipline_type_averages
            })
        
        # Общая статистика
        all_values = [g["value"] for g in formatted_grades]
        overall_average = round(sum(all_values) / len(all_values), 2) if all_values else 0
        
        overall_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for g in formatted_grades:
            overall_distribution[g["value"]] += 1
        
        # Получаем последние 10 оценок
        sorted_grades = sorted(formatted_grades, key=lambda x: x["date"], reverse=True)
        recent_grades = []
        
        for i, grade in enumerate(sorted_grades[:10]):
            # Получаем название дисциплины
            discipline_name = "Неизвестная дисциплина"
            if grade["discipline_id"] in disciplines_data:
                discipline_name = disciplines_data[grade["discipline_id"]]["name"]
            
            recent_grades.append({
                "id": grade["id"],
                "value": grade["value"],
                "type": grade["type"],
                "discipline_name": discipline_name,
                "date": grade["date"].isoformat(),
                "description": grade["description"]
            })
        
        # Формируем итоговый результат
        result = {
            "student_id": student_id,
            "disciplines": discipline_analytics,
            "overall_stats": {
                "average": overall_average,
                "count": len(formatted_grades),
                "distribution": overall_distribution,
                "type_averages": type_averages
            },
            "recent_grades": recent_grades
        }
        
        logger.info(f"Аналитика сформирована для студента {student_id}")
        # Преобразуем все ObjectId в строки перед возвращением
        return GradeAnalyticsService.convert_objectid(result) 