import React from 'react';
import { Paper, Box, Typography, Chip } from '@mui/material';
import { LessonSchedule } from '../../types';

interface ScheduleCardProps {
  lesson: LessonSchedule;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ lesson }) => {
  // Функция для получения цвета типа занятия
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Лекция':
        return 'primary';
      case 'Практика':
        return 'success';
      case 'Лабораторная':
        return 'info';
      case 'Семинар':
        return 'secondary';
      case 'Экзамен':
        return 'error';
      case 'Зачет':
        return 'warning';
      default:
        return 'default';
    }
  };
  
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 2, 
        borderRadius: 3,
        border: '1px solid rgba(0, 0, 0, 0.06)',
        background: 'rgba(255, 255, 255, 0.5)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 12px rgba(0, 0, 0, 0.05)',
        }
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={600}>
            {lesson.subject}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {lesson.teacher}, ауд. {lesson.room}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {lesson.date}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Chip 
            label={lesson.type} 
            size="small" 
            color={getTypeColor(lesson.type) as any}
            variant="outlined"
            sx={{ fontWeight: 500, mb: 1 }}
          />
          <Typography variant="body2" color="text.secondary">
            {lesson.time}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};

export default ScheduleCard; 