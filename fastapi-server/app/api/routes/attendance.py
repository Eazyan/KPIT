from typing import List, Any, Optional
from datetime import datetime, date
import logging
import json
import base64
import uuid
from fastapi import APIRouter, Depends, HTTPException, status, Body, Query
from bson import ObjectId

from ...core.database import db, users_collection, groups_collection, disciplines_collection, attendance_collection
from ...middlewares.auth import get_current_active_user, TokenData, check_roles
from ...models.user import UserRole
from ...models.attendance import AttendanceStatus, AttendanceCreate, QRCodeData

# Настройка логирования
logger = logging.getLogger(__name__)

router = APIRouter()

# Получение списка групп для преподавателя
@router.get("/groups", summary="Получение списка групп преподавателя")
async def get_teacher_groups(
    current_user: TokenData = Depends(get_current_active_user),
    check_teacher: None = Depends(check_roles([UserRole.TEACHER, UserRole.HEAD_OF_DEPARTMENT]))
) -> List[dict]:
    """
    Получение списка групп, в которых преподает преподаватель
    """
    # Находим дисциплины, которые ведет преподаватель
    disciplines = list(disciplines_collection.find({"teacher": ObjectId(current_user.id)}))
    
    # Собираем уникальные идентификаторы групп
    group_ids = set()
    for discipline in disciplines:
        group_ids.update([group_id for group_id in discipline.get("groups", [])])
    
    # Получаем информацию о группах
    groups = []
    for group_id in group_ids:
        group = groups_collection.find_one({"_id": group_id})
        if group:
            groups.append({
                "id": str(group["_id"]),
                "name": group["name"],
                "specialization": group["specialization"],
                "course": group["course"]
            })
    
    return groups

# Получение списка дисциплин для выбранной группы
@router.get("/disciplines", summary="Получение списка дисциплин для группы")
async def get_group_disciplines(
    group_id: str = Query(..., description="ID группы"),
    current_user: TokenData = Depends(get_current_active_user),
    check_teacher: None = Depends(check_roles([UserRole.TEACHER, UserRole.HEAD_OF_DEPARTMENT]))
) -> List[dict]:
    """
    Получение списка дисциплин, которые преподаватель ведет в выбранной группе
    """
    # Проверяем валидность ObjectId
    try:
        group_oid = ObjectId(group_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Некорректный ID группы"
        )
    
    # Находим дисциплины, которые ведет преподаватель в этой группе
    disciplines = list(disciplines_collection.find({
        "teacher": ObjectId(current_user.id),
        "groups": group_oid
    }))
    
    return [{
        "id": str(discipline["_id"]),
        "name": discipline["name"],
        "semester": discipline["semester"]
    } for discipline in disciplines]

# Получение списка студентов для выбранной группы
@router.get("/students", summary="Получение списка студентов группы")
async def get_group_students(
    group_name: str = Query(..., description="Название группы"),
    current_user: TokenData = Depends(get_current_active_user),
    check_teacher: None = Depends(check_roles([UserRole.TEACHER, UserRole.HEAD_OF_DEPARTMENT]))
) -> List[dict]:
    """
    Получение списка студентов, обучающихся в выбранной группе
    """
    logger.info(f"Запрос на получение студентов группы '{group_name}'")
    
    # Находим студентов группы
    students = list(users_collection.find({"role": UserRole.STUDENT, "group": group_name}))
    logger.info(f"Найдено студентов: {len(students)}")
    
    result = [{
        "id": str(student["_id"]),
        "fullName": student["name"],  # Используем "fullName" для совместимости с клиентом
        "email": student["email"]
    } for student in students]
    
    for student in result:
        logger.info(f"Студент: {student['fullName']}, ID: {student['id']}")
    
    return result

# Получение или создание записей о посещаемости для выбранной группы и дисциплины на дату
@router.get("/records", summary="Получение записей о посещаемости")
async def get_attendance_records(
    group_name: str = Query(..., description="Название группы"),
    discipline_id: str = Query(..., description="ID дисциплины"),
    attendance_date: date = Query(..., description="Дата занятия (ГГГГ-ММ-ДД)"),
    current_user: TokenData = Depends(get_current_active_user),
    check_teacher: None = Depends(check_roles([UserRole.TEACHER, UserRole.HEAD_OF_DEPARTMENT]))
) -> dict:
    """
    Получение или создание записей о посещаемости для выбранной группы и дисциплины на дату
    """
    logger.info(f"Запрос на получение посещаемости: группа='{group_name}', дисциплина='{discipline_id}', дата='{attendance_date}'")
    
    # Попробуем исправить кодированное имя группы
    if group_name.startswith('%'):
        try:
            import urllib.parse
            decoded_group = urllib.parse.unquote(group_name)
            logger.info(f"Декодировано имя группы из '{group_name}' в '{decoded_group}'")
            group_name = decoded_group
        except Exception as e:
            logger.error(f"Ошибка декодирования имени группы: {str(e)}")
    
    try:
        discipline_oid = ObjectId(discipline_id)
    except:
        logger.error(f"Некорректный ID дисциплины: {discipline_id}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Некорректный ID дисциплины"
        )
    
    # Проверяем, что дисциплина принадлежит преподавателю
    discipline = disciplines_collection.find_one({
        "_id": discipline_oid,
        "teacher": ObjectId(current_user.id)
    })
    
    if not discipline:
        logger.error(f"Дисциплина не найдена или не принадлежит преподавателю: {discipline_id}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Дисциплина не найдена или не принадлежит текущему преподавателю"
        )
    
    # Получаем студентов группы
    logger.info(f"Ищем студентов в группе '{group_name}'")
    students = list(users_collection.find({"role": UserRole.STUDENT, "group": group_name}))
    logger.info(f"Найдено студентов в группе '{group_name}': {len(students)}")
    
    # Выводим имена студентов для отладки
    for student in students:
        logger.info(f"Студент в группе: {student.get('name')} (ID: {student.get('_id')})")
    
    # Формируем дату для поиска
    attendance_datetime = datetime.combine(attendance_date, datetime.min.time())
    
    # Ищем записи о посещаемости
    attendance_records = {}
    
    # Получаем все записи посещаемости для этой дисциплины и даты
    all_records = list(attendance_collection.find({
        "discipline_id": discipline_id,
        "date": attendance_datetime,
    }))
    
    logger.info(f"Найдено записей о посещаемости для дисциплины {discipline_id}: {len(all_records)}")
    for record in all_records:
        logger.info(f"Запись посещаемости: студент={record.get('student_id')}, статус={record.get('status')}, группа студента={record.get('student_group', 'не указана')}")
    
    for student in students:
        student_id_str = str(student["_id"])
        
        # Ищем запись о посещаемости для этого студента
        record = next((rec for rec in all_records if rec.get("student_id") == student_id_str), None)
        
        # Добавляем подробное логирование
        if record:
            logger.info(f"Для студента {student['name']} найдена запись посещаемости со статусом {record.get('status')}")
        else:
            logger.info(f"Для студента {student['name']} НЕ найдена запись посещаемости")
        
        attendance_records[student_id_str] = {
            "student_id": student_id_str,
            "fullName": student["name"],  # Используем согласованное имя поля
            "name": student["name"],      # Оставляем для обратной совместимости
            "status": record["status"] if record else AttendanceStatus.ABSENT,
            "updated_at": record["updated_at"] if record else None
        }
    
    result = {
        "group_name": group_name,
        "discipline_name": discipline["name"],
        "date": attendance_date.isoformat(),
        "students": list(attendance_records.values())
    }
    
    logger.info(f"Возвращаем {len(result['students'])} записей о посещаемости")
    return result

# Обновление записей о посещаемости
@router.post("/update", summary="Обновление записей о посещаемости")
async def update_attendance_records(
    attendance_data: List[AttendanceCreate] = Body(..., description="Данные о посещаемости"),
    current_user: TokenData = Depends(get_current_active_user),
    check_teacher: None = Depends(check_roles([UserRole.TEACHER, UserRole.HEAD_OF_DEPARTMENT]))
) -> dict:
    """
    Обновление записей о посещаемости для студентов
    """
    updated_records = []
    
    for record in attendance_data:
        try:
            # Проверяем, что дисциплина принадлежит преподавателю
            discipline = disciplines_collection.find_one({
                "_id": ObjectId(record.discipline_id),
                "teacher": ObjectId(current_user.id)
            })
            
            if not discipline:
                continue
            
            # Обновляем запись в базе данных
            result = attendance_collection.update_one(
                {
                    "student_id": record.student_id,
                    "discipline_id": record.discipline_id,
                    "date": datetime.combine(record.date, datetime.min.time())
                },
                {
                    "$set": {
                        "status": record.status,
                        "updated_by": current_user.id,
                        "updated_at": datetime.utcnow()
                    }
                },
                upsert=True
            )
            
            if result.modified_count > 0 or result.upserted_id:
                updated_records.append(record.student_id)
        
        except Exception as e:
            logger.error(f"Ошибка при обновлении записи о посещаемости: {str(e)}")
    
    return {"updated": len(updated_records), "students": updated_records}

# Генерация QR-кода для отметки посещаемости
@router.post("/generate-qr", summary="Генерация QR-кода для отметки посещаемости")
async def generate_attendance_qr(
    group_name: str = Body(..., description="Название группы"),
    discipline_id: str = Body(..., description="ID дисциплины"),
    attendance_date: date = Body(..., description="Дата занятия (ГГГГ-ММ-ДД)"),
    current_user: TokenData = Depends(get_current_active_user),
    check_teacher: None = Depends(check_roles([UserRole.TEACHER, UserRole.HEAD_OF_DEPARTMENT]))
) -> dict:
    """
    Генерация QR-кода с данными для отметки посещаемости
    """
    try:
        discipline_oid = ObjectId(discipline_id)
    except:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Некорректный ID дисциплины"
        )
    
    # Проверяем, что дисциплина принадлежит преподавателю
    discipline = disciplines_collection.find_one({
        "_id": discipline_oid,
        "teacher": ObjectId(current_user.id)
    })
    
    if not discipline:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Дисциплина не найдена или не принадлежит текущему преподавателю"
        )
    
    # Создаем данные для QR-кода
    qr_data = {
        "teacher_id": current_user.id,
        "discipline_id": discipline_id,
        "group_name": group_name,
        "date": attendance_date.isoformat(),
        "token": str(uuid.uuid4()),  # Уникальный токен для предотвращения повторного использования
        "timestamp": datetime.utcnow().isoformat(),
        "expires_in": 180  # QR-код действителен 3 минуты
    }
    
    # Кодируем данные в JSON и затем в Base64
    json_data = json.dumps(qr_data)
    encoded_data = base64.b64encode(json_data.encode()).decode()
    
    return {
        "qr_data": encoded_data,
        "expires_in": qr_data["expires_in"],
        "group_name": group_name,
        "discipline_name": discipline["name"],
        "date": attendance_date.isoformat()
    }

# Отметка посещаемости по QR-коду
@router.post("/mark-by-qr", summary="Отметка посещаемости по QR-коду")
async def mark_attendance_by_qr(
    qr_data: QRCodeData = Body(..., description="Данные из QR-кода"),
    current_user: TokenData = Depends(get_current_active_user),
    check_student: None = Depends(check_roles([UserRole.STUDENT]))
) -> dict:
    """
    Отметка посещаемости студента по QR-коду
    """
    try:
        # Декодируем данные QR-кода
        decoded_bytes = base64.b64decode(qr_data.data)
        decoded_data = json.loads(decoded_bytes)
        
        # Получаем текущего студента
        student = users_collection.find_one({"_id": ObjectId(current_user.id)})
        if not student:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Студент не найден"
            )
        
        # Проверяем, что QR-код еще действителен
        qr_timestamp = datetime.fromisoformat(decoded_data["timestamp"])
        current_time = datetime.utcnow()
        time_diff = (current_time - qr_timestamp).total_seconds()
        
        if time_diff > decoded_data["expires_in"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="QR-код просрочен. Пожалуйста, отсканируйте новый QR-код."
            )
        
        # Проверяем, что студент принадлежит к указанной группе
        group = groups_collection.find_one({"name": student.get("group")})
        if not group or str(group["_id"]) != decoded_data["groupId"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Вы не принадлежите к группе, для которой создан этот QR-код"
            )
        
        # Проверяем, что дисциплина существует
        discipline = disciplines_collection.find_one({"_id": ObjectId(decoded_data["discipline_id"])})
        if not discipline:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Дисциплина не найдена"
            )
        
        # Отмечаем посещаемость
        attendance_date = datetime.fromisoformat(decoded_data["date"])
        
        result = attendance_collection.update_one(
            {
                "student_id": current_user.id,
                "discipline_id": decoded_data["discipline_id"],
                "date": datetime.combine(attendance_date.date(), datetime.min.time())
            },
            {
                "$set": {
                    "status": AttendanceStatus.PRESENT,
                    "updated_by": current_user.id,
                    "updated_at": datetime.utcnow(),
                    "qr_token": decoded_data["token"]
                }
            },
            upsert=True
        )
        
        if result.modified_count > 0 or result.upserted_id:
            return {
                "success": True,
                "message": "Посещаемость успешно отмечена",
                "discipline": discipline["name"],
                "date": attendance_date.date().isoformat()
            }
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Не удалось отметить посещаемость. Пожалуйста, попробуйте снова."
            )
            
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Некорректный формат QR-кода"
        )
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        logger.error(f"Детальная ошибка при отметке посещаемости по QR-коду: {error_detail}")
        logger.error(f"Данные запроса: {qr_data}")
        logger.error(f"Ошибка при отметке посещаемости по QR-коду: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Произошла ошибка при обработке данных: {str(e)}"
        )

# Отметка посещаемости студентом через QR-код
@router.post("/student/mark-qr", summary="Отметка посещаемости по QR-коду для студента")
async def student_mark_attendance(
    data: dict = Body(..., description="Данные из QR-кода"),
    current_user: TokenData = Depends(get_current_active_user),
    check_student: None = Depends(check_roles([UserRole.STUDENT]))
):
    """
    Отметка посещаемости студента по отсканированному QR-коду
    """
    logger.info(f"Получен запрос на отметку посещаемости от студента {current_user.id}")
    logger.info(f"Данные QR-кода: {data}")
    
    # Упрощенная версия обработки
    try:
        # Получаем студента
        student = users_collection.find_one({"_id": ObjectId(current_user.id)})
        if not student:
            logger.error(f"Студент с ID {current_user.id} не найден")
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Студент не найден"
            )
        
        # Проверяем, есть ли нужные поля в запросе
        if "subjectId" not in data:
            logger.error("Отсутствует ID дисциплины в данных QR-кода")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Отсутствует обязательное поле: subjectId"
            )
        
        if "date" not in data:
            logger.error("Отсутствует дата в данных QR-кода")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Отсутствует обязательное поле: date"
            )
        
        # Находим дисциплину
        try:
            discipline = disciplines_collection.find_one({"_id": ObjectId(data["subjectId"])})
            if not discipline:
                logger.error(f"Дисциплина с ID {data['subjectId']} не найдена")
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Дисциплина не найдена"
                )
        except Exception as e:
            logger.error(f"Ошибка при поиске дисциплины: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Неверный формат ID дисциплины: {str(e)}"
            )
        
        # Преобразуем дату
        try:
            attendance_date = datetime.strptime(data["date"], "%Y-%m-%d")
        except ValueError as e:
            logger.error(f"Ошибка при преобразовании даты: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Неверный формат даты: {str(e)}"
            )
        
        # Получаем информацию о группе студента для логирования
        student_group = student.get("group", "Неизвестная группа")
        logger.info(f"Студент {student['name']} из группы {student_group} отмечает посещаемость")
        
        # Логируем информацию для отладки
        if "groupName" in data:
            logger.info(f"QR код содержит имя группы: {data['groupName']}")
        if "groupId" in data:
            logger.info(f"QR код содержит ID группы: {data['groupId']}")
        
        # Создаем запись о посещаемости
        attendance_record = {
            "student_id": current_user.id,
            "discipline_id": data["subjectId"],
            "date": datetime.combine(attendance_date.date(), datetime.min.time()),
            "status": AttendanceStatus.PRESENT,
            "updated_by": current_user.id,
            "updated_at": datetime.utcnow(),
            "qr_data": data,
            "student_group": student_group,  # Добавляем группу студента для удобства поиска
        }
        
        # Сохраняем запись
        result = attendance_collection.update_one(
            {
                "student_id": current_user.id,
                "discipline_id": data["subjectId"],
                "date": datetime.combine(attendance_date.date(), datetime.min.time())
            },
            {"$set": attendance_record},
            upsert=True
        )
        
        logger.info(f"Результат сохранения: modified={result.modified_count}, upserted={result.upserted_id}")
        
        # Возвращаем результат
        return {
            "success": True,
            "message": "Посещаемость успешно отмечена",
            "discipline": discipline["name"],
            "date": attendance_date.date().isoformat()
        }
    
    except HTTPException:
        # Просто перехватываем HTTP-исключения
        raise
    
    except Exception as e:
        import traceback
        error_detail = traceback.format_exc()
        logger.error(f"Детальная ошибка при отметке посещаемости по QR-коду: {error_detail}")
        logger.error(f"Данные запроса: {data}")
        logger.error(f"Ошибка при отметке посещаемости по QR-коду: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Произошла ошибка при обработке данных: {str(e)}"
        )

# Тестовый эндпоинт для отладки QR-кода
@router.post("/debug-qr", summary="Отладка данных QR-кода")
async def debug_qr_data(
    data: dict = Body(..., description="Данные из QR-кода"),
    current_user: TokenData = Depends(get_current_active_user)
) -> dict:
    """
    Тестовый эндпоинт для отладки данных QR-кода
    """
    try:
        logger.info(f"Получены данные QR-кода для отладки: {data}")
        
        # Просто возвращаем полученные данные и информацию о пользователе
        user_info = {
            "user_id": current_user.id,
            "role": current_user.role
        }
        
        return {
            "success": True,
            "message": "Данные QR-кода получены",
            "qr_data": data,
            "user_info": user_info
        }
    except Exception as e:
        import traceback
        logger.error(f"Ошибка при отладке QR-кода: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "success": False,
            "message": f"Ошибка при обработке данных: {str(e)}",
            "qr_data": data
        } 