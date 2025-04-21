import axios from 'axios';

// Создаем экземпляр axios с базовыми настройками
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5005/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Интерцептор для добавления токена авторизации
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 Отправка запроса: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, config);
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Интерцептор для обработки ошибок
api.interceptors.response.use(
  (response) => {
    console.log(`✅ Получен ответ: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.log(`❌ Ошибка запроса:`, error.config, error.response);
    // Если ошибка 401 (неавторизован), выходим из аккаунта
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('user');
      localStorage.removeItem('userToken');
      // Перенаправляем на страницу входа
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Авторизация и управление пользователями
export const authAPI = {
  login: async (email: string, password: string) => {
    // Используем формат x-www-form-urlencoded для OAuth2
    const formData = new URLSearchParams();
    formData.append('username', email); // FastAPI ожидает 'username' вместо 'email'
    formData.append('password', password);
    
    const response = await axios.post(`${process.env.REACT_APP_API_URL}/auth/login`, formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    return response.data;
  },
  register: async (userData: any) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },
  getProfile: async () => {
    const response = await api.get('/auth/profile');
    return response.data;
  },
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

// Управление посещаемостью
export const attendanceAPI = {
  getByLesson: async (lessonId: string) => {
    const response = await api.get(`/attendance/lesson/${lessonId}`);
    return response.data;
  },
  getByStudent: async (studentId: string) => {
    const response = await api.get(`/attendance/student/${studentId}`);
    return response.data;
  },
  getGroups: async () => {
    const response = await api.get('/attendance/groups');
    return response.data;
  },
  getDisciplines: async (groupId: string) => {
    const response = await api.get(`/attendance/disciplines?group_id=${groupId}`);
    return response.data;
  },
  getRecords: async (params: { group_name: string, discipline_id: string, attendance_date: string }) => {
    const response = await api.get('/attendance/records', { params });
    return response.data;
  },
  update: async (attendanceData: any) => {
    const response = await api.post('/attendance/update', attendanceData);
    return response.data;
  },
  generateQR: async (data: { group_name: string, discipline_id: string, attendance_date: string }) => {
    const response = await api.post('/attendance/generate-qr', data);
    return response.data;
  },
  markByQR: async (studentId: string, qrData: any) => {
    const response = await api.post('/attendance/student/mark-qr', qrData);
    return response.data;
  },
};

// Управление оценками
export const gradesAPI = {
  getByDiscipline: async (disciplineId: string) => {
    const response = await api.get(`/grades/discipline/${disciplineId}`);
    return response.data;
  },
  getByStudent: async (studentId: string) => {
    const response = await api.get(`/grades/student/${studentId}`);
    return response.data;
  },
  create: async (gradeData: any) => {
    const response = await api.post('/grades', gradeData);
    return response.data;
  },
  update: async (id: string, gradeData: any) => {
    const response = await api.put(`/grades/${id}`, gradeData);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/grades/${id}`);
    return response.data;
  },
};

export { api }; 