import React, { useState, useEffect } from 'react';
import {
  Typography,
  CircularProgress,
  Alert,
  Box,
  Grid,
  Container
} from '@mui/material';

const MyGrades = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Имитация загрузки данных
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        Произошла ошибка при загрузке данных: {error}
      </Alert>
    );
  }

  return (
    <Container>
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Мои оценки
        </Typography>
        <Typography variant="body1">
          Здесь будет отображаться информация об успеваемости студента, включая средний балл, 
          график оценок по предметам и другую полезную статистику.
        </Typography>
      </Box>
      
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Box p={3} border="1px solid #e0e0e0" borderRadius={2}>
            <Typography variant="h5" gutterBottom>
              Общая статистика
            </Typography>
            <Typography>
              Средний балл: 4.5
            </Typography>
            <Typography>
              Всего оценок: 42
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Box p={3} border="1px solid #e0e0e0" borderRadius={2}>
            <Typography variant="h5" gutterBottom>
              Последние оценки
            </Typography>
            <Typography>
              Программирование: 5 (Экзамен)
            </Typography>
            <Typography>
              Базы данных: 4 (Лабораторная работа)
            </Typography>
            <Typography>
              Web-разработка: 5 (Контрольная работа)
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default MyGrades; 