import React, { createContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { api } from '../services/api';
import axios from 'axios';
import { UserRole } from '../types';
import { Buffer } from 'buffer';

// Настройки API - используем API_URL из переменных окружения или указываем шлюз API
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:6000/api';

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  group?: string;
  department?: string;
  token?: string;
}

// Интерфейс для содержимого JWT токена
interface JwtPayload {
  sub: string;
  role: string;
  exp: number;
  iat: number;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: false,
  error: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingToken, setIsCheckingToken] = useState<boolean>(false);

  // Используем useCallback для logout, чтобы функция была стабильной в зависимостях
  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('userToken');
  }, []);

  // Проверка наличия сохраненного пользователя при загрузке
  useEffect(() => {
    let isMounted = true; // Флаг для предотвращения утечек памяти

    const loadUser = async () => {
      // Предотвращаем повторные проверки
      if (isCheckingToken) return;
      
      setIsCheckingToken(true);
      try {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('userToken');
        
        if (storedUser && token) {
          // Проверяем срок действия токена на клиенте
          if (isTokenExpired(token)) {
            console.log('Токен истек');
            logout();
            if (isMounted) setLoading(false);
            return;
          }
          
          // Если токен действителен, устанавливаем пользователя
          const userData = JSON.parse(storedUser) as User;
          if (isMounted) setUser(userData);
          
          // Дополнительная проверка на сервере только если предыдущие проверки прошли успешно
          try {
            // Используем собственный экземпляр axios для проверки профиля
            // чтобы избежать перехватчиков, которые могут вызвать зацикливание
            const baseApi = axios.create({
              baseURL: API_URL,
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              }
            });
            
            // Проверка работоспособности API
            try {
              const profileResponse = await baseApi.get('/auth/user');
              console.log('Профиль успешно проверен', profileResponse.data);
            } catch (error: any) {
              // Игнорируем 500-е ошибки при проверке профиля, если мы уже прошли клиентскую проверку токена
              if (error.response && error.response.status === 500) {
                console.warn('Ошибка 500 при проверке профиля, но токен валиден на клиенте. Продолжаем сессию.');
                // Не выходим из системы, так как токен может быть валидным,
                // а сервер мог временно быть недоступен или иметь внутреннюю ошибку
              } else if (error.response && error.response.status === 401) {
                console.error('Ошибка авторизации (401) при проверке профиля:', error);
                logout();
              } else {
                console.error('Ошибка при проверке профиля:', error);
                // Для других ошибок (например, сетевых) не выходим из системы
              }
            }
          } catch (error) {
            console.error('Ошибка при декодировании токена:', error);
            logout();
          }
        } else {
          // Если нет данных пользователя, просто продолжаем
          console.log('Нет данных пользователя в localStorage');
        }
      } catch (error) {
        console.error('Ошибка при загрузке пользователя:', error);
        logout();
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsCheckingToken(false);
        }
      }
    };

    loadUser();

    // Функция очистки для предотвращения утечек памяти
    return () => {
      isMounted = false;
    };
  }, [logout, isCheckingToken]); // Добавляем isCheckingToken и logout в зависимости

  // Функция входа в систему
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      // Используем напрямую axios вместо api, чтобы обойти интерцепторы при логине
      const response = await axios.post(`${API_URL}/auth/login`, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      // Проверяем ответ
      if (!response.data || !response.data.token) {
        throw new Error('Ошибка при входе: токен не получен');
      }
      
      // Сохраняем данные пользователя
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      localStorage.setItem('userToken', response.data.token);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Ошибка при входе в систему');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Функция регистрации
  const register = async (userData: any) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/auth/register', userData);
      
      // Сохраняем данные пользователя
      setUser(response.data);
      localStorage.setItem('user', JSON.stringify(response.data));
      localStorage.setItem('userToken', response.data.token);
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Ошибка при регистрации');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}; 