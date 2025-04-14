import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5005/api';

// Создаем экземпляр axios с базовым URL
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Перехватчик запросов для добавления токена авторизации
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('userToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Перехватчик ответов для обработки ошибок 401 (не авторизован)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // При ошибке авторизации очищаем localStorage и перенаправляем на страницу входа
      localStorage.removeItem('user');
      localStorage.removeItem('userToken');
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
    
    const response = await axios.post(`${API_URL}/auth/login`, formData, {
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
  create: async (attendanceData: any) => {
    const response = await api.post('/attendance', attendanceData);
    return response.data;
  },
  update: async (id: string, attendanceData: any) => {
    const response = await api.put(`/attendance/${id}`, attendanceData);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/attendance/${id}`);
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

// Управление расписанием
export const scheduleAPI = {
  getAll: async () => {
    const response = await api.get('/schedule');
    return response.data;
  },
  getByGroup: async (groupId: string) => {
    const response = await api.get(`/schedule/group/${groupId}`);
    return response.data;
  },
  getByTeacher: async (teacherId: string) => {
    const response = await api.get(`/schedule/teacher/${teacherId}`);
    return response.data;
  },
  getByDate: async (date: string) => {
    const response = await api.get(`/schedule/date/${date}`);
    return response.data;
  },
  create: async (scheduleData: any) => {
    const response = await api.post('/schedule', scheduleData);
    return response.data;
  },
  update: async (id: string, scheduleData: any) => {
    const response = await api.put(`/schedule/${id}`, scheduleData);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/schedule/${id}`);
    return response.data;
  },
};

export default api; 