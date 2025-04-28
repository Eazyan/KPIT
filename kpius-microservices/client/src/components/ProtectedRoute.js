import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Компонент для защиты маршрутов, требующих аутентификации
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  // Пока идет проверка аутентификации, показываем индикатор загрузки
  if (loading) {
    return <div className="loading">Проверка доступа...</div>;
  }

  // Если пользователь не аутентифицирован, перенаправляем на страницу входа
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }

  // Если пользователь аутентифицирован, рендерим дочерние компоненты
  return children;
};

export default ProtectedRoute; 