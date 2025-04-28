from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from pydantic_settings import BaseSettings
import motor.motor_asyncio
from typing import List, Optional
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
import aiohttp
import pandas as pd
from io import BytesIO
import json

load_dotenv()

class Settings(BaseSettings):
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://mongodb:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "kpiusdb")
    ATTENDANCE_SERVICE_URL: str = os.getenv("ATTENDANCE_SERVICE_URL", "http://attendance-service:8003")
    USER_SERVICE_URL: str = os.getenv("USER_SERVICE_URL", "http://user-service:8002")

settings = Settings()
app = FastAPI(title="Reporting Service")

# Подключение к MongoDB
client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]

class ReportRequest(BaseModel):
    start_date: datetime
    end_date: datetime
    user_ids: Optional[List[str]] = None
    report_type: str  # "attendance", "summary", "detailed"

async def get_user_data(user_id: str):
    async with aiohttp.ClientSession() as session:
        async with session.get(f"{settings.USER_SERVICE_URL}/users/{user_id}") as response:
            if response.status == 200:
                return await response.json()
    return None

async def get_attendance_data(user_id: str, start_date: datetime, end_date: datetime):
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
    return []

def generate_excel_report(data: List[dict], report_type: str) -> BytesIO:
    df = pd.DataFrame(data)
    
    output = BytesIO()
    with pd.ExcelWriter(output, engine='xlsxwriter') as writer:
        df.to_excel(writer, sheet_name='Report', index=False)
        
        # Получаем объект worksheet
        worksheet = writer.sheets['Report']
        
        # Форматирование
        header_format = writer.book.add_format({
            'bold': True,
            'text_wrap': True,
            'valign': 'top',
            'fg_color': '#D7E4BC',
            'border': 1
        })
        
        # Применяем форматирование к заголовкам
        for col_num, value in enumerate(df.columns.values):
            worksheet.write(0, col_num, value, header_format)
            worksheet.set_column(col_num, col_num, 15)
    
    output.seek(0)
    return output

@app.post("/reports/generate")
async def generate_report(request: ReportRequest):
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
        return excel_file
    
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
        return excel_file
    
    else:
        raise HTTPException(status_code=400, detail="Unsupported report type")

@app.get("/reports/templates")
async def get_report_templates():
    templates = await db.report_templates.find().to_list(length=10)
    return templates

@app.post("/reports/templates")
async def create_report_template(template: dict):
    result = await db.report_templates.insert_one(template)
    template["id"] = str(result.inserted_id)
    return template

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "reporting-service"} 