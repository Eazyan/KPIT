import React, { createContext, useState, useEffect, useContext } from 'react';
import { api } from '../services/api';

// Создание контекста аутентификации
const AuthContext = createContext(null);

// Провайдер аутентификации
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  
  // Проверка аутентификации пользователя при загрузке
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          // Получение данных пользователя
          const response = await api.get('/auth/user');
          setUser(response.data);
        } catch (error) {
          console.error('Ошибка аутентификации:', error);
          logout();
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [token]);
  
  // Функция входа пользователя
  const login = async (credentials) => {
    try {
      const response = await api.post('/auth/login', credentials);
      const { token, user } = response.data;
      
      // Сохранение токена и данных пользователя
      localStorage.setItem('token', token);
      setToken(token);
      setUser(user);
      
      return { success: true };
    } catch (error) {
      console.error('Ошибка входа:', error);
      return { 
        success: false, 
        message: error.response?.data?.detail || 'Произошла ошибка при входе' 
      };
    }
  };
  
  // Функция регистрации пользователя
  const register = async (userData) => {
    try {
      const response = await api.post('/auth/register', userData);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      return { 
        success: false, 
        message: error.response?.data?.detail || 'Произошла ошибка при регистрации' 
      };
    }
  };
  
  // Функция выхода пользователя
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };
  
  // Значение контекста
  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!user,
    login,
    register,
    logout
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Хук для использования контекста аутентификации
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth должен использоваться внутри AuthProvider');
  }
  return context;
}; 