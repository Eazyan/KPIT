"""
Модуль сервисов для работы с оценками студентов.
"""

from .grade_service import GradeService
from .grade_analytics_service import GradeAnalyticsService

__all__ = ['GradeService', 'GradeAnalyticsService']
