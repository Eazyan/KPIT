import axios from 'axios';

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:6000/api'
});

// Добавляем перехватчик запросов для подстановки токена аутентификации
api.interceptors.request.use(
  (config) => {
    // Добавляем токен аутентификации из локального хранилища, если он есть
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Добавляем перехватчик ответов для обработки ошибок
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Если получен ответ с кодом 401 Unauthorized, значит токен истек или неверный
    if (error.response && error.response.status === 401) {
      // Очищаем токен и перенаправляем на страницу логина
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export { api }; 