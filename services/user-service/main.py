from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from pydantic_settings import BaseSettings
import motor.motor_asyncio
from typing import List, Optional
from dotenv import load_dotenv
import os
import aiohttp

load_dotenv()

class Settings(BaseSettings):
    MONGODB_URL: str = os.getenv("MONGODB_URL", "mongodb://mongodb:27017")
    DATABASE_NAME: str = os.getenv("DATABASE_NAME", "kpiusdb")
    AUTH_SERVICE_URL: str = os.getenv("AUTH_SERVICE_URL", "http://auth-service:8001")

settings = Settings()
app = FastAPI(title="User Service")

# Подключение к MongoDB
client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URL)
db = client[settings.DATABASE_NAME]

class UserProfile(BaseModel):
    username: str
    email: str
    full_name: str
    role: str
    department: Optional[str] = None
    position: Optional[str] = None

class UserProfileUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    department: Optional[str] = None
    position: Optional[str] = None

async def verify_token(token: str):
    async with aiohttp.ClientSession() as session:
        async with session.get(
            f"{settings.AUTH_SERVICE_URL}/users/me",
            headers={"Authorization": f"Bearer {token}"}
        ) as response:
            if response.status != 200:
                raise HTTPException(status_code=401, detail="Invalid token")
            return await response.json()

@app.get("/users/{username}", response_model=UserProfile)
async def get_user_profile(username: str, token: str):
    await verify_token(token)
    user = await db.user_profiles.find_one({"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserProfile(**user)

@app.put("/users/{username}", response_model=UserProfile)
async def update_user_profile(username: str, profile: UserProfileUpdate, token: str):
    await verify_token(token)
    update_data = {k: v for k, v in profile.dict().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    result = await db.user_profiles.update_one(
        {"username": username},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    updated_user = await db.user_profiles.find_one({"username": username})
    return UserProfile(**updated_user)

@app.get("/users", response_model=List[UserProfile])
async def list_users(token: str, skip: int = 0, limit: int = 10):
    await verify_token(token)
    users = await db.user_profiles.find().skip(skip).limit(limit).to_list(length=limit)
    return [UserProfile(**user) for user in users] 