@echo off
REM KPIUS Docker startup script for Windows
REM Usage: start.bat [dev|prod|down|restart|logs|help]

if "%1"=="" goto help
if "%1"=="help" goto help

if "%1"=="dev" (
    echo Starting development environment...
    docker-compose -f docker-compose.dev.yml up --build
    goto end
)

if "%1"=="prod" (
    echo Starting production environment...
    docker-compose up --build
    goto end
)

if "%1"=="down" (
    echo Stopping containers...
    docker-compose -f docker-compose.yml down
    docker-compose -f docker-compose.dev.yml down
    goto end
)

if "%1"=="restart" (
    echo Restarting containers...
    docker-compose -f docker-compose.yml down
    docker-compose -f docker-compose.dev.yml down
    
    if "%2"=="dev" (
        docker-compose -f docker-compose.dev.yml up --build
    ) else (
        docker-compose up --build
    )
    goto end
)

if "%1"=="logs" (
    echo Showing logs...
    if "%2"=="dev" (
        docker-compose -f docker-compose.dev.yml logs -f
    ) else (
        docker-compose logs -f
    )
    goto end
)

:help
echo.
echo KPIUS Docker Starter
echo Usage: start.bat [command]
echo.
echo Commands:
echo   dev     - Start development environment with hot reloading
echo   prod    - Start production environment
echo   down    - Stop all containers
echo   restart - Restart containers (use with dev or prod, e.g. start.bat restart dev)
echo   logs    - Show container logs (use with dev or prod, e.g. start.bat logs dev)
echo   help    - Show this help message
echo.

:end 