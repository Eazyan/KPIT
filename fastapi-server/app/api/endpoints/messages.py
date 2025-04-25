from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.utils.rabbitmq import rabbitmq

router = APIRouter()

class Message(BaseModel):
    content: str

@router.post("/send")
async def send_message(message: Message):
    try:
        rabbitmq.declare_queue("messages")
        
        rabbitmq.publish("messages", {"content": message.content})
        
        return {"status": "success", "message": "Message sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 