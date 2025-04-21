# Инициализация пакета routes 
from fastapi import APIRouter

router = APIRouter()

from . import auth
from . import attendance 