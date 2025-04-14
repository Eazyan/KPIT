import React, { useState, useEffect, useContext } from 'react';
import { Box, Typography, Card, CardContent, CircularProgress, Alert } from '@mui/material';
import { Layout } from '../../components/Layout';
import { ScheduleList, ScheduleFilter } from '../../components/Schedule';
import { ScheduleFilterState } from '../../components/Schedule/ScheduleFilter';
import { scheduleAPI, groupsAPI } from '../../services/api';
import { LessonSchedule } from '../../types';
import { AuthContext } from '../../context/AuthContext';

const SchedulePage: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [lessons, setLessons] = useState<LessonSchedule[]>([]);
  const [filteredLessons, setFilteredLessons] = useState<LessonSchedule[]>([]);
  const [groups, setGroups] = useState<{_id: string, name: string}[]>([]);
  const [teachers, setTeachers] = useState<{_id: string, name: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Загрузка расписания при монтировании компонента
  useEffect(() => {
    const loadSchedule = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Загрузка расписания в зависимости от роли пользователя
        let scheduleData: LessonSchedule[] = [];
        
        if (user?.role === 'STUDENT' && user?.group) {
          scheduleData = await scheduleAPI.getByGroup(user.group);
        } else if (user?.role === 'TEACHER' && user?._id) {
          scheduleData = await scheduleAPI.getByTeacher(user._id);
        } else {
          scheduleData = await scheduleAPI.getAll();
        }
        
        // Чтобы избежать ошибок, если API не готов, используем моковые данные
        if (scheduleData.length === 0) {
          scheduleData = getMockScheduleData();
        }
        
        setLessons(scheduleData);
        setFilteredLessons(scheduleData);
        
        // Загрузка списка групп для фильтра
        const groupsData = await groupsAPI.getAll();
        setGroups(groupsData.length > 0 ? groupsData : getMockGroups());
        
        // В будущем здесь будет загрузка списка преподавателей
        setTeachers(getMockTeachers());
      } catch (error: any) {
        console.error('Ошибка при загрузке расписания:', error);
        setError(error.message || 'Не удалось загрузить расписание');
        
        // Используем моковые данные в случае ошибки
        const mockData = getMockScheduleData();
        setLessons(mockData);
        setFilteredLessons(mockData);
        setGroups(getMockGroups());
        setTeachers(getMockTeachers());
      } finally {
        setLoading(false);
      }
    };
    
    loadSchedule();
  }, [user]);
  
  // Обработка изменения фильтров
  const handleFilterChange = (filters: ScheduleFilterState) => {
    let filtered = [...lessons];
    
    // Фильтр по группе
    if (filters.group) {
      filtered = filtered.filter(lesson => lesson.group === filters.group);
    }
    
    // Фильтр по преподавателю
    if (filters.teacher) {
      filtered = filtered.filter(lesson => lesson.teacher && lesson.teacher.includes(filters.teacher as string));
    }
    
    // Фильтр по типу занятия
    if (filters.type) {
      filtered = filtered.filter(lesson => lesson.type === filters.type);
    }
    
    // Фильтр по дате
    if (filters.date) {
      const filterDate = new Date(filters.date);
      const formattedFilterDate = filterDate.toISOString().split('T')[0]; // YYYY-MM-DD
      
      filtered = filtered.filter(lesson => {
        const lessonDate = new Date(lesson.date);
        const formattedLessonDate = lessonDate.toISOString().split('T')[0];
        return formattedLessonDate === formattedFilterDate;
      });
    }
    
    setFilteredLessons(filtered);
  };
  
  // Моковые данные для демонстрации
  const getMockScheduleData = (): LessonSchedule[] => [
    {
      _id: '1',
      subject: 'Программирование',
      type: 'Лекция',
      time: '10:00 - 11:30',
      date: '2023-10-15',
      teacher: 'Иванов Иван Иванович',
      room: 'G317',
      group: '1'
    },
    {
      _id: '2',
      subject: 'Базы данных',
      type: 'Практика',
      time: '12:00 - 13:30',
      date: '2023-10-15',
      teacher: 'Петров Петр Петрович',
      room: 'G223',
      group: '1'
    },
    {
      _id: '3',
      subject: 'Компьютерные сети',
      type: 'Лабораторная',
      time: '14:00 - 15:30',
      date: '2023-10-16',
      teacher: 'Сидоров Сидор Сидорович',
      room: 'G450',
      group: '2'
    },
    {
      _id: '4',
      subject: 'Математический анализ',
      type: 'Семинар',
      time: '10:00 - 11:30',
      date: '2023-10-16',
      teacher: 'Иванов Иван Иванович',
      room: 'G317',
      group: '2'
    },
    {
      _id: '5',
      subject: 'Иностранный язык',
      type: 'Практика',
      time: '12:00 - 13:30',
      date: '2023-10-17',
      teacher: 'Кузнецова Анна Ивановна',
      room: 'G105',
      group: '1'
    }
  ];
  
  const getMockGroups = () => [
    { _id: '1', name: 'Б9120-09.03.03пикд'},
    { _id: '2', name: 'Б9121-09.03.03пикд'}
  ];
  
  const getMockTeachers = () => [
    { _id: '1', name: 'Иванов Иван Иванович' },
    { _id: '2', name: 'Петров Петр Петрович' },
    { _id: '3', name: 'Сидоров Сидор Сидорович' },
    { _id: '4', name: 'Кузнецова Анна Ивановна' }
  ];
  
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Расписание занятий
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Просмотр и управление расписанием занятий
        </Typography>
      </Box>
      
      <Card
        elevation={0}
        sx={{
          borderRadius: 4,
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          overflow: 'visible',
        }}
      >
        <CardContent sx={{ p: { xs: 2, md: 4 } }}>
          <ScheduleFilter 
            onFilterChange={handleFilterChange} 
            groups={groups}
            teachers={teachers}
          />
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <ScheduleList 
              lessons={filteredLessons} 
              title="Предстоящие занятия"
            />
          )}
        </CardContent>
      </Card>
    </Layout>
  );
};

export default SchedulePage; 