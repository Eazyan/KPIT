from typing import List, Optional, Dict, Any, Union
import logging
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from bson import ObjectId

from ...models.grades import GradeCreate, GradeResponse, GradeAnalytics, StudentGradeSummary
from ...middlewares.auth import get_current_active_user, check_roles
from ...models.user import UserRole, UserInDB, TokenData
from ...services.grades import GradeService, GradeAnalyticsService
from ...core.database import users_collection, grades_collection, disciplines_collection

# Настройка логирования
logger = logging.getLogger(__name__)

router = APIRouter()

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
        
        try:
            # Используем сервисный слой для добавления оценки
            result = await GradeService.add_grade(
                student_id=student_id,
                discipline_id=discipline_id,
                grade_value=grade_value,
                grade_type=grade_type,
                description=description,
                weight=weight,
                date=date,
                created_by=str(current_user["_id"])
            )
            return result
        except ValueError as e:
            # Преобразуем ошибки валидации в HTTP исключения
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
    
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
async def get_student_grades(current_user: TokenData = Depends(get_current_active_user)):
    """
    Получить все оценки текущего студента
    """
    try:
        user_id = current_user.id if hasattr(current_user, "id") else str(current_user["_id"])
        
        # Находим все оценки для данного студента (синхронный вызов)
        grades = list(grades_collection.find({"student_id": user_id}))
        
        # Преобразуем ObjectId в строки и обеспечиваем совместимость с GradeJournal
        for grade in grades:
            if "_id" in grade:
                grade["id"] = str(grade["_id"])
            
            # Убедимся, что все необходимые поля присутствуют
            if "value" in grade and not isinstance(grade["value"], str):
                grade["value"] = str(grade["value"])
            
            # Проверим, есть ли discipline_name, если нет - получим его
            if "discipline_id" in grade and "discipline_name" not in grade:
                # Используем синхронную версию find_one
                discipline = disciplines_collection.find_one({"_id": ObjectId(grade["discipline_id"])})
                if discipline:
                    grade["discipline_name"] = discipline.get("name", "Неизвестная дисциплина")
                else:
                    grade["discipline_name"] = "Неизвестная дисциплина"
            
            # Форматируем дату если она в неправильном формате
            if "date" in grade and not isinstance(grade["date"], str):
                grade["date"] = grade["date"].strftime("%Y-%m-%d")
        
        # Преобразуем все ObjectId в строки перед возвращением
        return GradeAnalyticsService.convert_objectid(grades)
    except Exception as e:
        logger.error(f"Непредвиденная ошибка при получении оценок: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Произошла ошибка при получении оценок: {str(e)}"
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
        
        try:
            # Используем сервисный слой для получения оценок по дисциплине
            return await GradeService.get_student_grades_by_discipline(target_student_id, discipline_id)
        except ValueError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
    
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
        
        # Используем сервисный слой для получения сводки оценок
        return await GradeService.get_student_grade_summary(target_student_id)
    
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
    current_user: Union[Dict, TokenData] = Depends(get_current_active_user),
    student_id: Optional[str] = None,
):
    """
    Расчет вероятности отчисления студента на основе его текущих оценок
    """
    try:
        # Определяем ID пользователя (студента) для анализа
        target_student_id = None
        
        logger.debug(f"Тип current_user: {type(current_user)}, содержимое: {current_user}")
        
        # Если указан явный student_id, проверяем права доступа
        if student_id:
            # Для студентов разрешаем только собственную аналитику
            user_id = None
            user_role = None
            
            # Получаем ID и роль пользователя в зависимости от типа объекта
            if isinstance(current_user, TokenData):
                user_id = current_user.id
                user_role = current_user.role
            elif isinstance(current_user, dict):
                user_id = current_user.get('id') or current_user.get('_id')
                user_role = current_user.get('role')
            
            # Проверяем, что студент имеет доступ только к своим данным
            if user_role == UserRole.STUDENT and str(user_id) != str(student_id):
                logger.warning(f"Студент {user_id} пытается получить вероятность отчисления другого студента {student_id}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Студент может просматривать только свою вероятность отчисления"
                )
            
            target_student_id = student_id
        else:
            # Если студент не указан, берем текущего пользователя (но только если он студент)
            if isinstance(current_user, TokenData):
                if current_user.role == UserRole.STUDENT:
                    target_student_id = current_user.id
            elif isinstance(current_user, dict):
                if current_user.get('role') == UserRole.STUDENT:
                    target_student_id = current_user.get('id') or current_user.get('_id')
        
        # Если ID студента не определен, возвращаем ошибку
        if not target_student_id:
            logger.error("Не удалось определить ID студента для расчета вероятности отчисления")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Необходимо указать ID студента"
            )
                
        logger.info(f"Расчет вероятности отчисления для студента: {target_student_id}")
        
        # Используем аналитический сервис для расчета вероятности отчисления
        return await GradeAnalyticsService.calculate_expulsion_probability(target_student_id)
    
    except HTTPException:
        # Пробрасываем HTTP ошибки дальше
        raise
    except Exception as e:
        logger.exception(f"Непредвиденная ошибка при расчете вероятности отчисления: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при расчете вероятности отчисления"
        )

# Роут для получения аналитики по оценкам студента
@router.get("/analytics", response_model=Dict[str, Any])
async def get_grades_analytics(
    current_user: Union[Dict, TokenData] = Depends(get_current_active_user),
    student_id: Optional[str] = None,
    by_discipline: bool = Query(False, description="Группировать данные по дисциплинам"),
    start_date: Optional[str] = Query(None, description="Дата начала периода в формате YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="Дата окончания периода в формате YYYY-MM-DD"),
):
    """
    Получение аналитической информации по оценкам студента
    """
    try:
        # Определяем ID пользователя (студента) для анализа
        target_student_id = None
        
        logger.debug(f"Тип current_user: {type(current_user)}, содержимое: {current_user}")
        
        # Если указан явный student_id, проверяем права доступа
        if student_id:
            # Для студентов разрешаем только собственную аналитику
            user_id = None
            user_role = None
            
            # Получаем ID и роль пользователя в зависимости от типа объекта
            if isinstance(current_user, TokenData):
                user_id = current_user.id
                user_role = current_user.role
            elif isinstance(current_user, dict):
                user_id = current_user.get('id') or current_user.get('_id')
                user_role = current_user.get('role')
            
            # Проверяем, что студент имеет доступ только к своим данным
            if user_role == UserRole.STUDENT and str(user_id) != str(student_id):
                logger.warning(f"Студент {user_id} пытается получить аналитику другого студента {student_id}")
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Студент может просматривать только свою аналитику"
                )
            
            target_student_id = student_id
        else:
            # Если студент не указан, берем текущего пользователя (но только если он студент)
            if isinstance(current_user, TokenData):
                if current_user.role == UserRole.STUDENT:
                    target_student_id = current_user.id
            elif isinstance(current_user, dict):
                if current_user.get('role') == UserRole.STUDENT:
                    target_student_id = current_user.get('id') or current_user.get('_id')
                
        # Если ID студента не определен, возвращаем ошибку
        if not target_student_id:
            logger.error("Не удалось определить ID студента для аналитики")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Необходимо указать ID студента для аналитики"
            )
            
        logger.info(f"Запрос аналитики по оценкам для студента: {target_student_id}")
        
        # Используем сервис для получения аналитики
        analytics = await GradeAnalyticsService.get_student_grade_analytics(target_student_id)
        
        # Аналитика уже возвращается с конвертированными ObjectId в строки
        return analytics
    
    except HTTPException:
        # Пробрасываем HTTP ошибки дальше
        raise
    except Exception as e:
        logger.exception(f"Непредвиденная ошибка при получении аналитики: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении аналитики"
        )

# Роут для получения всех оценок по дисциплине (для преподавателей и админов)
@router.get("/discipline/{discipline_id}/all", response_model=List[Dict[str, Any]])
async def get_all_discipline_grades(
    discipline_id: str,
    current_user: Union[Dict, TokenData] = Depends(get_current_active_user),
):
    """
    Получение всех оценок по дисциплине для всех студентов
    Доступно только для администраторов и преподавателей, ведущих эту дисциплину
    """
    try:
        # Получаем ID пользователя и его роль
        user_id = None
        user_role = None
        
        if isinstance(current_user, TokenData):
            user_id = current_user.id
            user_role = current_user.role
        elif isinstance(current_user, dict):
            user_id = current_user.get('id') or current_user.get('_id')
            user_role = current_user.get('role')
        else:
            user_id = getattr(current_user, 'id', None) or getattr(current_user, '_id', None)
            user_role = getattr(current_user, 'role', None)
            
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Не удалось определить идентификатор пользователя",
            )
            
        # Проверяем права доступа - только преподаватели и администраторы
        if user_role not in [UserRole.ADMIN, UserRole.TEACHER]:
            logger.warning(
                f"Попытка неавторизованного доступа к оценкам дисциплины {discipline_id} "
                f"пользователем {user_id} с ролью {user_role}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Доступ запрещен. Недостаточно прав для просмотра всех оценок по дисциплине.",
            )

        # Для преподавателей проверяем, что они ведут эту дисциплину
        if user_role == UserRole.TEACHER:
            # Получаем информацию о преподавателе
            teacher = await users_collection.find_one({"_id": ObjectId(user_id)})
            if not teacher:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Преподаватель не найден"
                )
            
            # Проверяем доступ преподавателя к дисциплине
            teacher_disciplines = teacher.get("disciplines", [])
            if discipline_id not in teacher_disciplines:
                logger.warning(
                    f"Преподаватель {user_id} пытается получить доступ "
                    f"к оценкам дисциплины {discipline_id}, которую он не ведет"
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Доступ запрещен. Вы не ведете эту дисциплину.",
                )

        logger.info(f"Получение всех оценок по дисциплине {discipline_id} пользователем {user_id}")
        
        # Получаем все оценки по дисциплине через сервисный слой
        try:
            grades = await GradeService.get_discipline_grades(discipline_id)
            logger.info(f"Успешно получены {len(grades)} оценок по дисциплине {discipline_id}")
            return grades
        except ValueError as e:
            logger.error(f"Ошибка валидации при получении оценок по дисциплине: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=str(e),
            )
    
    except HTTPException:
        # Пробрасываем HTTP исключения дальше
        raise
    except Exception as e:
        logger.error(f"Ошибка при получении оценок по дисциплине {discipline_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Внутренняя ошибка сервера при получении оценок",
        ) 