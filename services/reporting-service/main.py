from fastapi import FastAPI, HTTPException, Depends, status, Response
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
import motor.motor_asyncio
from typing import List, Optional, Annotated
from datetime import datetime, timedelta, UTC
from dotenv import load_dotenv
import os
import aiohttp
import pandas as pd
from io import BytesIO
import json
from fastapi.middleware.cors import CORSMiddleware
import logging
from contextlib import asynccontextmanager

# Настройка логирования
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class Settings(BaseSettings):
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://mongodb:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "kpiusdb")
    ATTENDANCE_SERVICE_URL: str = os.getenv("ATTENDANCE_SERVICE_URL", "http://attendance-service:8003")
    USER_SERVICE_URL: str = os.getenv("USER_SERVICE_URL", "http://user-service:8002")
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "your-secret-key")

settings = Settings()

@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        # Startup
        logger.info("Reporting service started")
        yield
    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise
    finally:
        # Shutdown
        logger.info("Reporting service stopped")

app = FastAPI(title="Reporting Service", lifespan=lifespan)

# Настройки CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Подключение к MongoDB
client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.AUTH_SERVICE_URL}/token")

class ReportRequest(BaseModel):
    start_date: datetime = Field(..., description="Начальная дата отчета")
    end_date: datetime = Field(..., description="Конечная дата отчета")
    user_ids: Optional[List[str]] = Field(None, description="Список ID пользователей")
    report_type: str = Field(..., description="Тип отчета (attendance, summary, detailed)")

class ReportTemplate(BaseModel):
    name: str = Field(..., description="Название шаблона")
    description: str = Field(..., description="Описание шаблона")
    fields: List[str] = Field(..., description="Список полей для отчета")
    filters: Optional[dict] = Field(None, description="Фильтры для отчета")

async def verify_token(token: Annotated[str, Depends(oauth2_scheme)]) -> dict:
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(
                f"{settings.AUTH_SERVICE_URL}/users/me",
                headers={"Authorization": f"Bearer {token}"}
            ) as response:
                if response.status != 200:
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Неверный токен"
                    )
                return await response.json()
        except aiohttp.ClientError as e:
            logger.error(f"Auth service error: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Сервис аутентификации недоступен"
            )

async def get_current_user(token: Annotated[str, Depends(oauth2_scheme)]) -> dict:
    return await verify_token(token)

async def get_user_data(user_id: str) -> Optional[dict]:
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{settings.USER_SERVICE_URL}/users/{user_id}") as response:
                if response.status == 200:
                    return await response.json()
                logger.warning(f"User not found: {user_id}")
                return None
    except aiohttp.ClientError as e:
        logger.error(f"User service error: {str(e)}")
        return None

async def get_attendance_data(user_id: str, start_date: datetime, end_date: datetime) -> List[dict]:
    try:
        async with aiohttp.ClientSession() as session:
            params = {
                "start_date": start_date.isoformat(),
                "end_date": end_date.isoformat()
            }
            async with session.get(
                f"{settings.ATTENDANCE_SERVICE_URL}/attendance/{user_id}",
                params=params
            ) as response:
                if response.status == 200:
                    return await response.json()
                logger.warning(f"Attendance data not found for user {user_id}")
                return []
    except aiohttp.ClientError as e:
        logger.error(f"Attendance service error: {str(e)}")
        return []

def generate_excel_report(data: List[dict], report_type: str) -> BytesIO:
    try:
        df = pd.DataFrame(data)
        
        output = BytesIO()
        with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
            df.to_excel(writer, sheet_name='Report', index=False)
            
            worksheet = writer.sheets['Report']
            
            header_format = writer.book.add_format({
                'bold': True,
                'text_wrap': True,
                'valign': 'top',
                'fg_color': '#D7E4BC',
                'border': 1
            })
            
            for col_num, value in enumerate(df.columns.values):
                worksheet.write(0, col_num, value, header_format)
                worksheet.set_column(col_num, col_num, 15)
        
        output.seek(0)
        return output
    except Exception as e:
        logger.error(f"Error generating Excel report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при генерации отчета"
        )

@app.post("/reports/generate")
async def generate_report(
    request: ReportRequest,
    current_user: Annotated[dict, Depends(get_current_user)]
):
    # Проверяем права доступа
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для генерации отчетов"
        )
    
    try:
        if request.report_type == "attendance":
            all_data = []
            user_ids = request.user_ids or []
            
            for user_id in user_ids:
                user_data = await get_user_data(user_id)
                if not user_data:
                    continue
                    
                attendance_data = await get_attendance_data(
                    user_id,
                    request.start_date,
                    request.end_date
                )
                
                for record in attendance_data:
                    record["user_name"] = user_data.get("full_name", "")
                    record["department"] = user_data.get("department", "")
                    all_data.append(record)
            
            excel_file = generate_excel_report(all_data, "attendance")
            return Response(
                content=excel_file.getvalue(),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=attendance_report.xlsx"}
            )
        
        elif request.report_type == "summary":
            summary_data = []
            user_ids = request.user_ids or []
            
            for user_id in user_ids:
                user_data = await get_user_data(user_id)
                if not user_data:
                    continue
                    
                attendance_data = await get_attendance_data(
                    user_id,
                    request.start_date,
                    request.end_date
                )
                
                check_ins = len([r for r in attendance_data if r["event_type"] == "check-in"])
                check_outs = len([r for r in attendance_data if r["event_type"] == "check-out"])
                
                summary_data.append({
                    "user_id": user_id,
                    "user_name": user_data.get("full_name", ""),
                    "department": user_data.get("department", ""),
                    "check_ins": check_ins,
                    "check_outs": check_outs,
                    "total_days": len(set(r["timestamp"].date() for r in attendance_data))
                })
            
            excel_file = generate_excel_report(summary_data, "summary")
            return Response(
                content=excel_file.getvalue(),
                media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                headers={"Content-Disposition": "attachment; filename=summary_report.xlsx"}
            )
        
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неподдерживаемый тип отчета"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating report: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при генерации отчета"
        )

@app.get("/reports/templates", response_model=List[ReportTemplate])
async def get_report_templates(current_user: Annotated[dict, Depends(get_current_user)]):
    # Проверяем права доступа
    if current_user["role"] not in ["admin", "manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для просмотра шаблонов"
        )
    
    try:
        templates = await db.report_templates.find().to_list(length=10)
        return [ReportTemplate(**template) for template in templates]
    except Exception as e:
        logger.error(f"Error getting templates: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при получении шаблонов"
        )

@app.post("/reports/templates", response_model=ReportTemplate)
async def create_report_template(
    template: ReportTemplate,
    current_user: Annotated[dict, Depends(get_current_user)]
):
    # Проверяем права доступа
    if current_user["role"] not in ["admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Недостаточно прав для создания шаблонов"
        )
    
    try:
        result = await db.report_templates.insert_one(template.dict())
        template.id = str(result.inserted_id)
        return template
    except Exception as e:
        logger.error(f"Error creating template: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Ошибка при создании шаблона"
        )

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "reporting-service"} 