# KPIUS Docker startup script for Windows (PowerShell)
# Usage: .\start.ps1 [dev|prod|down|restart|logs|help]

function Show-Help {
    Write-Host "`nKPIUS Docker Starter" -ForegroundColor Cyan
    Write-Host "Usage: .\start.ps1 [command]`n" -ForegroundColor White
    
    Write-Host "Commands:" -ForegroundColor Yellow
    Write-Host "  dev     - Start development environment with hot reloading"
    Write-Host "  prod    - Start production environment"
    Write-Host "  down    - Stop all containers"
    Write-Host "  restart - Restart containers (use with dev or prod, e.g. .\start.ps1 restart dev)"
    Write-Host "  logs    - Show container logs (use with dev or prod, e.g. .\start.ps1 logs dev)"
    Write-Host "  help    - Show this help message`n"
}

# Проверка наличия Docker
function Test-DockerAvailable {
    try {
        $null = docker --version
        return $true
    }
    catch {
        Write-Host "Docker не установлен или не запущен." -ForegroundColor Red
        Write-Host "Пожалуйста, установите Docker Desktop и запустите его перед использованием этого скрипта.`n" -ForegroundColor Red
        return $false
    }
}

# Основная логика
if (-not (Test-DockerAvailable)) { exit 1 }

if ($args.Count -eq 0 -or $args[0] -eq "help") {
    Show-Help
    exit 0
}

switch ($args[0]) {
    "dev" {
        Write-Host "Запуск среды разработки..." -ForegroundColor Green
        docker-compose -f docker-compose.dev.yml up --build
    }
    "prod" {
        Write-Host "Запуск продакшн-среды..." -ForegroundColor Green
        docker-compose up --build
    }
    "down" {
        Write-Host "Остановка контейнеров..." -ForegroundColor Yellow
        docker-compose -f docker-compose.yml down
        docker-compose -f docker-compose.dev.yml down
    }
    "restart" {
        Write-Host "Перезапуск контейнеров..." -ForegroundColor Yellow
        docker-compose -f docker-compose.yml down
        docker-compose -f docker-compose.dev.yml down
        
        if ($args.Count -gt 1 -and $args[1] -eq "dev") {
            Write-Host "Запуск среды разработки..." -ForegroundColor Green
            docker-compose -f docker-compose.dev.yml up --build
        } else {
            Write-Host "Запуск продакшн-среды..." -ForegroundColor Green
            docker-compose up --build
        }
    }
    "logs" {
        Write-Host "Отображение логов..." -ForegroundColor Cyan
        if ($args.Count -gt 1 -and $args[1] -eq "dev") {
            docker-compose -f docker-compose.dev.yml logs -f
        } else {
            docker-compose logs -f
        }
    }
    default {
        Write-Host "Неизвестная команда: $($args[0])" -ForegroundColor Red
        Show-Help
        exit 1
    }
} 