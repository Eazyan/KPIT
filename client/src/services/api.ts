import axios from 'axios';
import { Buffer } from 'buffer';
import { UserRole } from '../types';

// Настройки API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Интерфейс для содержимого JWT токена
interface JwtPayload {
  sub: string;
  role: string;
  exp: number;
  iat: number;
}

// Флаг для отслеживания перенаправления
let isRedirecting = false;

// Создаем экземпляр axios с базовыми настройками
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Функция для безопасного декодирования JWT токена
const decodeJwt = (token: string): JwtPayload | null => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('Неверный формат JWT токена');
      return null;
    }
    
    // Декодируем payload часть токена (часть между первой и второй точкой)
    const payload = Buffer.from(parts[1], 'base64').toString();
    return JSON.parse(payload);
  } catch (error) {
    console.error('Ошибка при декодировании токена:', error);
    return null;
  }
};

// Проверка срока действия токена
const isTokenExpired = (token: string): boolean => {
  try {
    const decoded = decodeJwt(token);
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    return true;
  }
};

// Интерцептор для обработки ответов
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Обработка ошибок от сервера
      const errorMessage = error.response.data?.detail || 
                         error.response.data?.message || 
                         'Произошла ошибка при выполнении запроса';
      return Promise.reject(new Error(errorMessage));
    } else if (error.request) {
      // Ошибка сети
      return Promise.reject(new Error('Ошибка сети. Проверьте подключение к интернету.'));
    } else {
      // Другие ошибки
      return Promise.reject(error);
    }
  }
);

// Интерцептор для добавления токена авторизации
api.interceptors.request.use(
  (config) => {
    const requestDesc = `${config.method ? config.method.toUpperCase() : 'GET'} ${config.url}`;
    console.log(`🚀 Отправка запроса: ${requestDesc}`);
    
    const token = localStorage.getItem('userToken');
    
    if (token) {
      if (isTokenExpired(token)) {
        console.warn('Токен истек. Необходима повторная авторизация.');
        
        const isAuthRequest = config.url && (
          config.url.includes('/auth/login') || 
          config.url.includes('/auth/register')
        );
        
        if (!isAuthRequest && !isRedirecting) {
          isRedirecting = true;
          localStorage.removeItem('user');
          localStorage.removeItem('userToken');
          
          setTimeout(() => {
            window.location.href = '/login';
            isRedirecting = false;
          }, 100);
          
          throw new Error('Токен истек. Пожалуйста, войдите снова.');
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface LoginResponse {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  token: string;
  group?: string;
  department?: string;
}

export const authService = {
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post('/api/v1/auth/login', { email, password });
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка при входе в систему');
    }
  },

  async register(userData: any): Promise<LoginResponse> {
    try {
      const response = await api.post('/api/v1/auth/register', userData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка при регистрации');
    }
  },

  async getProfile(): Promise<any> {
    try {
      const response = await api.get('/api/v1/users/me');
      return response.data;
    } catch (error: any) {
      throw new Error(error.message || 'Ошибка при получении профиля');
    }
  },

  logout() {
    localStorage.removeItem('user');
    localStorage.removeItem('userToken');
  }
}; 