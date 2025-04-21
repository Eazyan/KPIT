from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import date, datetime
from enum import Enum


class GradeValue(str, Enum):
    """Значения оценок от 1 до 5"""
    ONE = "1"
    TWO = "2" 
    THREE = "3"
    FOUR = "4"
    FIVE = "5"


class GradeType(str, Enum):
    """Типы оценок"""
    EXAM = "exam"           # Экзамен
    TEST = "test"           # Тест
    HOMEWORK = "homework"   # Домашнее задание
    QUIZ = "quiz"           # Контрольная
    PROJECT = "project"     # Проект
    LAB = "lab"             # Лабораторная работа
    MIDTERM = "midterm"     # Промежуточная оценка
    FINAL = "final"         # Финальная оценка


class GradeCreate(BaseModel):
    """Модель для создания оценки"""
    student_id: str
    discipline_id: str
    value: GradeValue
    type: GradeType
    description: Optional[str] = None
    date: date
    weight: Optional[float] = Field(default=1.0, ge=0.0, le=10.0)  # Вес оценки (от 0 до 10)


class GradeResponse(BaseModel):
    """Модель для ответа с оценкой"""
    id: str
    student_id: str
    discipline_id: str
    value: GradeValue
    type: GradeType
    description: Optional[str] = None
    date: date
    weight: float
    created_at: datetime
    updated_at: Optional[datetime] = None
    created_by: str
    discipline_name: Optional[str] = None


class StudentGradeSummary(BaseModel):
    """Сводка оценок студента по дисциплине"""
    discipline_id: str
    discipline_name: str
    average_grade: float
    grades_count: int
    grades_distribution: dict  # Распределение оценок по значениям
    last_grade: Optional[GradeResponse] = None


class GradeAnalytics(BaseModel):
    """Аналитика оценок студента"""
    overall_average: float
    total_grades: int
    grades_by_type: dict
    grades_by_discipline: List[StudentGradeSummary]
    expulsion_probability: float
    recent_grades: List[GradeResponse]
    grade_trend: float  # Изменение среднего балла за последнее время 