import React from 'react';
import { Box, Typography, Stack, Divider } from '@mui/material';
import ScheduleCard from './ScheduleCard';
import { LessonSchedule } from '../../types';

interface ScheduleListProps {
  lessons: LessonSchedule[];
  title?: string;
}

const ScheduleList: React.FC<ScheduleListProps> = ({ lessons, title }) => {
  // Группировка занятий по дате
  const groupByDate = (lessons: LessonSchedule[]) => {
    const grouped: { [key: string]: LessonSchedule[] } = {};
    
    lessons.forEach(lesson => {
      if (!grouped[lesson.date]) {
        grouped[lesson.date] = [];
      }
      grouped[lesson.date].push(lesson);
    });
    
    return grouped;
  };
  
  const groupedLessons = groupByDate(lessons);
  
  // Получение отформатированной даты
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long'
    };
    
    return date.toLocaleDateString('ru-RU', options);
  };
  
  return (
    <Box>
      {title && (
        <Typography variant="h6" fontWeight={600} mb={3}>
          {title}
        </Typography>
      )}
      
      {Object.keys(groupedLessons).length > 0 ? (
        Object.entries(groupedLessons).map(([date, dateLessons], index) => (
          <Box key={date} sx={{ mb: 4 }}>
            <Typography variant="subtitle1" fontWeight={600} color="primary" mb={2}>
              {formatDate(date)}
            </Typography>
            
            <Stack spacing={2}>
              {dateLessons.map(lesson => (
                <ScheduleCard key={lesson._id} lesson={lesson} />
              ))}
            </Stack>
            
            {index < Object.keys(groupedLessons).length - 1 && (
              <Divider sx={{ mt: 4 }} />
            )}
          </Box>
        ))
      ) : (
        <Typography variant="body1" color="text.secondary" align="center" py={4}>
          Нет запланированных занятий
        </Typography>
      )}
    </Box>
  );
};

export default ScheduleList; 