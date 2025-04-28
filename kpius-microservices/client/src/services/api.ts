import axios from 'axios';
import { Buffer } from 'buffer';
import { UserRole } from '../types';

// Настройки API - используем API URL из переменных окружения или адрес API-шлюза
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6000/api';

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
const api = axios.create({
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
    // Декодируем токен
    const decoded = decodeJwt(token);
    const currentTime = Math.floor(Date.now() / 1000);
    
    // Проверяем, что exp существует и больше текущего времени
    if (!decoded || !decoded.exp) {
      return true;
    }
    
    return decoded.exp < currentTime;
  } catch (error) {
    console.error('Ошибка при проверке токена:', error);
    return true; // Если возникла ошибка при декодировании, считаем токен истекшим
  }
};

// Интерцептор для добавления токена авторизации
api.interceptors.request.use(
  (config) => {
    const requestDesc = `${config.method ? config.method.toUpperCase() : 'GET'} ${config.url}`;
    console.log(`🚀 Отправка запроса: ${requestDesc}`);
    
    const token = localStorage.getItem('userToken');
    
    if (token) {
      // Проверяем срок действия токена перед его использованием
      if (isTokenExpired(token)) {
        console.warn('Токен истек. Необходима повторная авторизация.');
        
        // Проверяем, не является ли запрос авторизационным
        const isAuthRequest = config.url && (
          config.url.includes('/auth/login') || 
          config.url.includes('/auth/register')
        );
        
        if (!isAuthRequest && !isRedirecting) {
          // Помечаем, что перенаправление уже выполняется
          isRedirecting = true;
          
          // Очищаем данные пользователя
          localStorage.removeItem('user');
          localStorage.removeItem('userToken');
          
          // Используем setTimeout, чтобы предотвратить возможные рекурсивные циклы редиректов
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
  (error) => Promise.reject(error)
);

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => {
    const requestDesc = `${response.config.method?.toUpperCase()} ${response.config.url}`;
    console.log(`✅ Ответ получен: ${requestDesc}`);
    return response;
  },
  (error) => {
    console.log(`❌ Ошибка запроса:`, error.message);
    
    // Обработка ошибок авторизации
    if (error.response) {
      // Если ошибка 401 (неавторизован)
      if (error.response.status === 401) {
        console.warn('Получен статус 401 Unauthorized');
        
        // Проверяем, не является ли запрос авторизационным
        const isAuthRequest = error.config.url && (
          error.config.url.includes('/auth/login') || 
          error.config.url.includes('/auth/register')
        );
        
        if (!isAuthRequest && !isRedirecting) {
          // Помечаем, что перенаправление уже выполняется
          isRedirecting = true;
          
          // Очищаем данные пользователя
          localStorage.removeItem('user');
          localStorage.removeItem('userToken');
          
          // Используем setTimeout, чтобы предотвратить возможные рекурсивные циклы редиректов
          setTimeout(() => {
            window.location.href = '/login';
            isRedirecting = false;
          }, 100);
        }
      }
    }
    
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

// Модуль API для работы с аутентификацией
export const authAPI = {
  // Функция для входа в систему
  async login(email: string, password: string): Promise<LoginResponse> {
    try {
      const response = await api.post('/auth/login', { email, password });
      
      // Сохраняем токен в заголовках для последующих запросов
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      return response.data;
    } catch (error) {
      console.error('Ошибка при входе:', error);
      throw error;
    }
  },
  
  // Функция для регистрации
  async register(userData: any): Promise<LoginResponse> {
    try {
      const response = await api.post('/auth/register', userData);
      
      // Сохраняем токен в заголовках для последующих запросов
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      
      return response.data;
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      throw error;
    }
  },
  
  // Получение профиля текущего пользователя
  async getProfile(): Promise<any> {
    try {
      const response = await api.get('/auth/user');
      return response.data;
    } catch (error) {
      console.error('Ошибка при получении профиля:', error);
      throw error;
    }
  },
  
  // Функция для выхода из системы
  logout() {
    // Удаляем токен из заголовков
    delete api.defaults.headers.common['Authorization'];
  }
};

// Управление группами
export const groupsAPI = {
  getAll: async () => {
    const response = await api.get('/groups');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/groups/${id}`);
    return response.data;
  },
  create: async (groupData: any) => {
    const response = await api.post('/groups', groupData);
    return response.data;
  },
  update: async (id: string, groupData: any) => {
    const response = await api.put(`/groups/${id}`, groupData);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/groups/${id}`);
    return response.data;
  },
};

// Управление дисциплинами
export const disciplinesAPI = {
  getAll: async () => {
    const response = await api.get('/disciplines');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/disciplines/${id}`);
    return response.data;
  },
  create: async (disciplineData: any) => {
    const response = await api.post('/disciplines', disciplineData);
    return response.data;
  },
  update: async (id: string, disciplineData: any) => {
    const response = await api.put(`/disciplines/${id}`, disciplineData);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/disciplines/${id}`);
    return response.data;
  },
};

// Управление занятиями
export const lessonsAPI = {
  getAll: async () => {
    const response = await api.get('/lessons');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/lessons/${id}`);
    return response.data;
  },
  getByGroup: async (groupId: string) => {
    const response = await api.get(`/lessons/group/${groupId}`);
    return response.data;
  },
  getByTeacher: async (teacherId: string) => {
    const response = await api.get(`/lessons/teacher/${teacherId}`);
    return response.data;
  },
  create: async (lessonData: any) => {
    const response = await api.post('/lessons', lessonData);
    return response.data;
  },
  update: async (id: string, lessonData: any) => {
    const response = await api.put(`/lessons/${id}`, lessonData);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/lessons/${id}`);
    return response.data;
  },
};

// Управление посещаемостью
export const attendanceAPI = {
  getAll: async () => {
    const response = await api.get('/attendance');
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/attendance/${id}`);
    return response.data;
  },
  getByStudent: async (studentId: string) => {
    const response = await api.get(`/attendance/student/${studentId}`);
    return response.data;
  },
  getByLesson: async (lessonId: string) => {
    const response = await api.get(`/attendance/lesson/${lessonId}`);
    return response.data;
  },
  create: async (attendanceData: any) => {
    const response = await api.post('/attendance', attendanceData);
    return response.data;
  },
  update: async (id: string, attendanceData: any) => {
    const response = await api.put(`/attendance/${id}`, attendanceData);
    return response.data;
  },
  markAttendance: async (studentId: string, lessonId: string, status: string) => {
    const response = await api.post('/attendance/mark', { studentId, lessonId, status });
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/attendance/${id}`);
    return response.data;
  },
};

export { api }; 