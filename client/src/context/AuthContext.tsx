import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';
import { UserRole } from '../types';

interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  group?: string;
  department?: string;
  token?: string;
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

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Проверка наличия сохраненного пользователя при загрузке
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          const userData = JSON.parse(storedUser) as User;
          setUser(userData);
          
          // Проверяем, валиден ли токен
          try {
            await api.get('/auth/profile');
          } catch (error) {
            // Если токен невалидный, выходим из аккаунта
            logout();
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке пользователя:', error);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Функция входа в систему
  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
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

  // Функция выхода из системы
  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('userToken');
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

export const useAuth = () => React.useContext(AuthContext); 