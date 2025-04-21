from typing import List, Optional, Dict, Any
import logging
import numpy as np
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from bson import ObjectId
import pandas as pd
import json

from ...models.grades import GradeCreate, GradeResponse, GradeAnalytics, StudentGradeSummary, GradeValue, GradeType
from ...core.database import db, users_collection, disciplines_collection
from ...middlewares.auth import get_current_active_user, TokenData, check_roles
from ...models.user import UserRole, UserInDB

# Настройка логирования
logger = logging.getLogger(__name__)

router = APIRouter()

# Коллекция оценок в MongoDB
grades_collection = db["grades"]

# Простая функция линейной регрессии вместо sklearn
def simple_linear_regression(X, y):
    """
    Простая реализация линейной регрессии без использования sklearn
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

# Роут для добавления оценки
@router.post("/add", status_code=status.HTTP_201_CREATED)
async def add_grade(
    discipline_id: str,
    student_id: str,
    grade_value: int,
    grade_type: str,
    description: Optional[str] = None,
    weight: float = 1.0,
    date: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
):
    try:
        # Проверяем роль пользователя
        if current_user["role"] not in [UserRole.TEACHER, UserRole.ADMIN]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Только преподаватели и администраторы могут добавлять оценки",
            )
            
        logger.info(f"Попытка добавления оценки: дисциплина={discipline_id}, студент={student_id}, значение={grade_value}")
        
        # Проверяем существование дисциплины
        discipline = await disciplines_collection.find_one({"_id": ObjectId(discipline_id)})
        if not discipline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Дисциплина с ID {discipline_id} не найдена",
            )
        
        # Проверяем существование студента
        student = await users_collection.find_one({"_id": ObjectId(student_id), "role": UserRole.STUDENT})
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Студент с ID {student_id} не найден",
            )
        
        # Проверяем, что оценка в допустимом диапазоне (1-5)
        if grade_value < 1 or grade_value > 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Оценка должна быть в диапазоне от 1 до 5",
            )
        
        # Проверяем тип оценки
        valid_types = ["exam", "test", "homework", "project", "activity"]
        if grade_type not in valid_types:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Неверный тип оценки. Допустимые типы: {', '.join(valid_types)}",
            )
        
        # Преобразуем строку даты в объект datetime, если она указана
        grade_date = None
        if date:
            try:
                grade_date = datetime.fromisoformat(date)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Неверный формат даты. Используйте формат ISO (YYYY-MM-DDTHH:MM:SS)",
                )
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
            "created_by": str(current_user["_id"])
        }
        
        result = await grades_collection.insert_one(grade)
        
        logger.info(f"Оценка успешно добавлена: {result.inserted_id}")
        return {"id": str(result.inserted_id), "message": "Оценка успешно добавлена"}
    
    except HTTPException as e:
        logger.error(f"Ошибка при добавлении оценки: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"Непредвиденная ошибка при добавлении оценки: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при добавлении оценки: {str(e)}",
        )

# Роут для получения всех оценок студента
@router.get("/student", response_model=List[Dict[str, Any]])
async def get_student_grades(
    student_id: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
):
    try:
        # Если student_id не указан, используем ID текущего пользователя
        target_student_id = student_id if student_id else str(current_user["_id"])
        
        # Проверяем права доступа
        if student_id and current_user["role"] == UserRole.STUDENT and str(current_user["_id"]) != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Студент может просматривать только свои оценки",
            )
        
        logger.info(f"Получение оценок для студента: {target_student_id}")
        
        # Получаем все оценки для студента
        cursor = grades_collection.find({"student_id": target_student_id})
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
        
        logger.info(f"Найдено {len(result)} оценок для студента {target_student_id}")
        return result
    
    except HTTPException as e:
        logger.error(f"Ошибка при получении оценок: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"Непредвиденная ошибка при получении оценок: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении оценок: {str(e)}",
        )

# Роут для получения оценок студента по конкретной дисциплине
@router.get("/discipline/{discipline_id}", response_model=List[Dict[str, Any]])
async def get_student_grades_by_discipline(
    discipline_id: str,
    student_id: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
):
    try:
        # Если student_id не указан, используем ID текущего пользователя
        target_student_id = student_id if student_id else str(current_user["_id"])
        
        # Проверяем права доступа
        if student_id and current_user["role"] == UserRole.STUDENT and str(current_user["_id"]) != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Студент может просматривать только свои оценки",
            )
        
        # Проверяем существование дисциплины
        discipline = disciplines_collection.find_one({"_id": ObjectId(discipline_id)})
        if not discipline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Дисциплина с ID {discipline_id} не найдена",
            )
        
        logger.info(f"Получение оценок для студента {target_student_id} по дисциплине {discipline_id}")
        
        # Получаем оценки по дисциплине
        grades = list(grades_collection.find({
            "student_id": target_student_id,
            "discipline_id": discipline_id
        }))
        
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
        
        logger.info(f"Найдено {len(result)} оценок для студента {target_student_id} по дисциплине {discipline_id}")
        return result
    
    except HTTPException as e:
        logger.error(f"Ошибка при получении оценок по дисциплине: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"Непредвиденная ошибка при получении оценок по дисциплине: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении оценок по дисциплине: {str(e)}",
        )

# Роут для получения сводки оценок студента
@router.get("/summary", response_model=Dict[str, Any])
async def get_student_grade_summary(
    student_id: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
):
    try:
        # Если student_id не указан, используем ID текущего пользователя
        target_student_id = student_id if student_id else str(current_user["_id"])
        
        # Проверяем права доступа
        if student_id and current_user["role"] == UserRole.STUDENT and str(current_user["_id"]) != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Студент может просматривать только свою сводку оценок",
            )
        
        logger.info(f"Получение сводки оценок для студента: {target_student_id}")
        
        # Получаем все оценки для студента
        grades = list(grades_collection.find({"student_id": target_student_id}))
        
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
            discipline = disciplines_collection.find_one({"_id": ObjectId(discipline_id)})
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
            "student_id": target_student_id,
            "disciplines": disciplines_summary,
            "overall_average": overall_average,
            "grade_distribution": overall_distribution,
            "total_grade_count": len(formatted_grades)
        }
        
        logger.info(f"Сводка оценок сформирована для студента {target_student_id}")
        return result
    
    except HTTPException as e:
        logger.error(f"Ошибка при получении сводки оценок: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"Непредвиденная ошибка при получении сводки оценок: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении сводки оценок: {str(e)}",
        )

# Роут для расчета вероятности отчисления
@router.get("/expulsion-probability", response_model=Dict[str, Any])
async def calculate_expulsion_probability(
    student_id: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
):
    try:
        # Если student_id не указан, используем ID текущего пользователя
        target_student_id = student_id if student_id else str(current_user["_id"])
        
        # Проверяем права доступа
        if student_id and current_user["role"] == UserRole.STUDENT and str(current_user["_id"]) != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Студент может просматривать только свою вероятность отчисления",
            )
        
        logger.info(f"Расчет вероятности отчисления для студента: {target_student_id}")
        
        # Получаем оценки студента
        grades = list(grades_collection.find({"student_id": target_student_id}))
        
        if not grades:
            return {
                "probability": 0,
                "message": "Недостаточно данных для расчета вероятности отчисления",
                "risk_factors": [],
                "trend": "stable"
            }
        
        # Получаем посещаемость студента
        attendance_records = list(db.attendance.find({"student_id": target_student_id}))
        
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
                model = simple_linear_regression(x, y)
                
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
            "student_id": target_student_id,
            "probability": round(probability, 2),
            "average_grade": round(average_grade, 2),
            "attendance_rate": round(attendance_rate, 2),
            "risk_factors": risk_factors,
            "trend": trend,
            "message": "Расчет основан на среднем балле и посещаемости"
        }
        
        logger.info(f"Вероятность отчисления рассчитана для студента {target_student_id}: {result['probability']}")
        return result
    
    except HTTPException as e:
        logger.error(f"Ошибка при расчете вероятности отчисления: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"Непредвиденная ошибка при расчете вероятности отчисления: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при расчете вероятности отчисления: {str(e)}",
        )

# Роут для получения аналитики по оценкам студента
@router.get("/analytics", response_model=Dict[str, Any])
async def get_student_grade_analytics(
    student_id: Optional[str] = None,
    current_user: UserInDB = Depends(get_current_active_user),
):
    try:
        logger.debug(f"Вызов get_student_grade_analytics с current_user={current_user}")
        
        # Если student_id не указан, используем ID текущего пользователя
        target_student_id = student_id if student_id else str(current_user["_id"])
        
        logger.debug(f"Target student ID: {target_student_id}, current_user ID={current_user['_id']}, role={current_user['role']}")
        
        # Проверяем права доступа
        if student_id and current_user["role"] == UserRole.STUDENT and str(current_user["_id"]) != student_id:
            logger.warning(f"Попытка студента {current_user['_id']} просмотреть аналитику студента {student_id}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Студент может просматривать только свою аналитику",
            )
        
        logger.info(f"Получение аналитики оценок для студента: {target_student_id}")
        
        # Получаем все оценки для студента
        # Используем синхронный метод find с list для преобразования курсора в список
        grades = list(grades_collection.find({"student_id": target_student_id}))
        logger.debug(f"Получено {len(grades)} оценок")
        
        if not grades:
            logger.info(f"У студента {target_student_id} нет оценок")
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
            "student_id": target_student_id,
            "disciplines": discipline_analytics,
            "overall_stats": {
                "average": overall_average,
                "count": len(formatted_grades),
                "distribution": overall_distribution,
                "type_averages": type_averages
            },
            "recent_grades": recent_grades
        }
        
        logger.info(f"Аналитика сформирована для студента {target_student_id}")
        return result
    
    except HTTPException as e:
        logger.error(f"Ошибка при получении аналитики: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"Непредвиденная ошибка при получении аналитики: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при получении аналитики: {str(e)}",
        ) 