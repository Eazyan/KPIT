from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, Response
import httpx

from app.core.config import get_settings
from app.core.auth import authenticate_request

settings = get_settings()
router = APIRouter()

# Список эндпоинтов, которые не требуют аутентификации
public_endpoints = [
    "/api/auth/login",
    "/api/auth/register",
    "/api/auth/login/oauth"
]

async def forward_auth_request(request: Request, path: str) -> Response:
    """
    Проксирование запроса к сервису аутентификации.
    """
    # Создаем полный URL для сервиса аутентификации
    target_url = f"{settings.AUTH_SERVICE_URL}{path}"
    
    # Получаем тело запроса (если есть)
    body = await request.body()
    
    # Копируем заголовки запроса
    headers = dict(request.headers.items())
    
    # Удаляем заголовки, которые не нужно пересылать
    headers.pop("host", None)
    
    try:
        # Выполняем запрос к сервису аутентификации
        async with httpx.AsyncClient() as client:
            response = await client.request(
                method=request.method,
                url=target_url,
                headers=headers,
                content=body,
                follow_redirects=True
            )
        
        # Создаем ответ на основе полученного от сервиса аутентификации
        return Response(
            content=response.content,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.headers.get("content-type")
        )
    except httpx.RequestError as exc:
        print(f"Ошибка при подключении к сервису аутентификации: {str(exc)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Ошибка при подключении к сервису аутентификации: {str(exc)}"
        )


# Специальный обработчик для логина
@router.post("/login")
async def login(request: Request):
    """
    Проксирование запроса на вход в сервис аутентификации
    """
    body = await request.json()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.AUTH_SERVICE_URL}/api/v1/auth/login",
            json=body,
            timeout=10.0
        )
        return JSONResponse(
            content=response.json(),
            status_code=response.status_code
        )


# Специальный обработчик для OAuth логина
@router.post("/login/oauth")
async def login_oauth(request: Request):
    """
    Проксирование запроса OAuth2 для Swagger UI
    """
    form_data = await request.form()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.AUTH_SERVICE_URL}/api/v1/auth/login/oauth",
            data=dict(form_data),
            timeout=10.0
        )
        return JSONResponse(
            content=response.json(),
            status_code=response.status_code
        )


# Маршрут для регистрации
@router.post("/register")
async def register(request: Request):
    """
    Проксирование запроса на регистрацию в сервис аутентификации
    """
    body = await request.json()
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{settings.AUTH_SERVICE_URL}/api/v1/auth/register",
            json=body,
            timeout=10.0
        )
        return JSONResponse(
            content=response.json(),
            status_code=response.status_code
        )


# Маршрут для получения текущего пользователя
@router.get("/user")
async def get_user_info(token: str = Depends(authenticate_request)):
    """
    Проксирование запроса для получения информации о пользователе
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.AUTH_SERVICE_URL}/api/v1/auth/user",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0
        )
        return JSONResponse(
            content=response.json(),
            status_code=response.status_code
        )


# Маршрут для валидации токена
@router.get("/validate")
async def validate_token(token: str = Depends(authenticate_request)):
    """
    Проверка валидности токена
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"{settings.AUTH_SERVICE_URL}/api/v1/auth/validate",
            headers={"Authorization": f"Bearer {token}"},
            timeout=10.0
        )
        return JSONResponse(
            content=response.json(),
            status_code=response.status_code
        )


# Общий маршрут для остальных запросов к сервису аутентификации
@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE"])
async def auth_proxy(request: Request, path: str):
    """
    Прокси для всех остальных запросов к сервису аутентификации.
    """
    return await forward_auth_request(request, f"/api/auth/{path}") 