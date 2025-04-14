#!/bin/bash

# Функции
show_help() {
  echo "Использование: ./start.sh [опция]"
  echo ""
  echo "Опции:"
  echo "  dev       - Запуск в режиме разработки с горячей перезагрузкой"
  echo "  prod      - Запуск в режиме продакшена"
  echo "  down      - Остановка контейнеров"
  echo "  restart   - Перезапуск контейнеров"
  echo "  logs      - Просмотр логов"
  echo "  help      - Показать эту подсказку"
}

# Основной код
case "$1" in
  dev)
    echo "Запуск в режиме разработки..."
    docker-compose -f docker-compose.dev.yml up -d --build
    echo "Сервисы запущены в режиме разработки"
    echo "Клиент: http://localhost:3000"
    echo "API: http://localhost:5005"
    echo "MongoDB: localhost:27017"
    ;;
  prod)
    echo "Запуск в режиме продакшена..."
    docker-compose up -d --build
    echo "Сервисы запущены в режиме продакшена"
    echo "Приложение доступно по адресу: http://localhost"
    ;;
  down)
    echo "Остановка контейнеров..."
    docker-compose down
    docker-compose -f docker-compose.dev.yml down
    ;;
  restart)
    echo "Перезапуск контейнеров..."
    if [ "$2" = "dev" ]; then
      docker-compose -f docker-compose.dev.yml restart
    else
      docker-compose restart
    fi
    ;;
  logs)
    if [ "$2" = "dev" ]; then
      docker-compose -f docker-compose.dev.yml logs -f
    else
      docker-compose logs -f
    fi
    ;;
  *)
    show_help
    ;;
esac 