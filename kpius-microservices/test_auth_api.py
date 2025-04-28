#!/usr/bin/env python3
"""
Скрипт для тестирования API аутентификации
"""
import requests
import json
import sys

# URL API Gateway
API_URL = "http://localhost:6000/api"

def test_login():
    """Тестирование входа в систему"""
    print("\n=== Тестирование входа в систему ===")
    
    login_url = f"{API_URL}/auth/login"
    credentials = {
        "email": "student@kpius.ru",
        "password": "student123"
    }
    
    try:
        response = requests.post(login_url, json=credentials)
        print(f"Статус код: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Токен: {data.get('token', 'Нет токена')}")
            return data.get('token')
        else:
            print(f"Ошибка: {response.text}")
            return None
    except Exception as e:
        print(f"Ошибка при выполнении запроса: {e}")
        return None

def test_user_info(token):
    """Тестирование получения информации о пользователе"""
    print("\n=== Тестирование получения информации о пользователе ===")
    
    if not token:
        print("Токен отсутствует, невозможно выполнить запрос")
        return
    
    user_url = f"{API_URL}/auth/user"
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(user_url, headers=headers)
        print(f"Статус код: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print(f"Информация о пользователе: {json.dumps(data, indent=2, ensure_ascii=False)}")
        else:
            print(f"Ошибка: {response.text}")
    except Exception as e:
        print(f"Ошибка при выполнении запроса: {e}")

def main():
    """Основная функция для запуска тестов"""
    print("Начало тестирования API аутентификации")
    
    # Тест входа
    token = test_login()
    
    # Тест получения информации о пользователе
    if token:
        test_user_info(token)
    
    print("\nТестирование завершено")

if __name__ == "__main__":
    main() 