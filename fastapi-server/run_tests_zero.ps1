# Проверяем наличие виртуального окружения
if (-not (Test-Path "venv")) {
    Write-Host "Создаем виртуальное окружение..."
    python -m venv venv
}

# Активируем виртуальное окружение для Windows
$activateScript = ".\venv\Scripts\Activate.ps1"
if (Test-Path $activateScript) {
    & $activateScript
} else {
    Write-Host "Ошибка: Не найден скрипт активации виртуального окружения"
    exit 1
}

# Обновляем pip и устанавливаем необходимые инструменты для сборки
python -m pip install --upgrade pip
python -m pip install setuptools wheel

Write-Host "Устанавливаем зависимости..."
pip install fastapi==0.115.0
pip install uvicorn[standard]==0.34.0
pip install pymongo==4.12.0
pip install pydantic==2.11.0
pip install python-jose[cryptography]==3.3.0
pip install passlib[bcrypt]==1.7.4
pip install python-multipart==0.0.7
pip install python-dotenv==1.0.1
pip install email-validator==2.0.0
pip install pika==1.3.2
pip install pytest==8.3.5

Write-Host "Запускаем тесты..."
python -m pytest tests/test_rabbitmq.py -v 