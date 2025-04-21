from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import date, datetime


class AttendanceStatus(str, Enum):
    """Статусы присутствия на занятии"""
    PRESENT = "П"  # Присутствовал
    ABSENT = "Н"   # Отсутствовал
    SICK = "Б"     # Болел
    EXCUSED = "У"  # Уважительная причина


class AttendanceBase(BaseModel):
    """Базовая модель для записи о посещаемости"""
    student_id: str
    discipline_id: str
    date: date
    status: AttendanceStatus

    model_config = {
        "json_schema_extra": {
            "description": {
                "student_id": "ID студента",
                "discipline_id": "ID дисциплины",
                "date": "Дата занятия",
                "status": "Статус присутствия"
            }
        }
    }


class AttendanceCreate(AttendanceBase):
    """Модель для создания записи о посещаемости"""
    pass


class Attendance(AttendanceBase):
    """Полная модель записи о посещаемости"""
    id: str
    updated_by: str
    updated_at: datetime
    qr_token: Optional[str] = None

    model_config = {
        "json_schema_extra": {
            "example": {
                "id": "507f1f77bcf86cd799439011",
                "student_id": "507f1f77bcf86cd799439012",
                "discipline_id": "507f1f77bcf86cd799439013",
                "date": "2023-01-15",
                "status": "present",
                "updated_by": "507f1f77bcf86cd799439014",
                "updated_at": "2023-01-15T10:30:00"
            },
            "description": {
                "id": "Уникальный идентификатор записи",
                "updated_by": "ID пользователя, обновившего запись",
                "updated_at": "Время последнего обновления",
                "qr_token": "Токен QR-кода, использованного для отметки"
            }
        }
    }


class QRCodeData(BaseModel):
    """Модель для передачи данных QR-кода"""
    data: str

    model_config = {
        "json_schema_extra": {
            "description": {
                "data": "Закодированные данные QR-кода"
            }
        }
    }


class AttendanceStatsResponse(BaseModel):
    """Модель для ответа со статистикой посещаемости"""
    student_id: str
    student_name: str
    total_classes: int
    present_count: int
    absent_count: int
    sick_count: int
    excused_count: int
    attendance_percentage: float 