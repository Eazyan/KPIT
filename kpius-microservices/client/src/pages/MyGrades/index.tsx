import React from 'react';
import { Box, Typography, Container, Paper, Grid, CircularProgress } from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { Grade, UserRole } from '../../types';
import { Navigate } from 'react-router-dom';

// Основная страница оценок, которая перенаправляет на соответствующую страницу в зависимости от роли
const MyGrades: React.FC = () => {
  const { user, loading } = useContext(AuthContext);
  const [loadingGrades, setLoadingGrades] = useState(false);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  // Если пользователь не авторизован, перенаправляем на страницу входа
  if (!user) {
    return <Navigate to="/login" />;
  }

  // Перенаправляем на соответствующую страницу в зависимости от роли
  switch (user.role) {
    case UserRole.STUDENT:
      return <Navigate to="/grades/student" />;
    case UserRole.TEACHER:
      return <Navigate to="/grades/teacher" />;
    case UserRole.ADMIN:
      return <Navigate to="/grades/admin" />;
    default:
      return (
        <Container maxWidth="lg">
          <Box my={4}>
            <Typography variant="h4" component="h1" gutterBottom>
              Доступ запрещен
            </Typography>
            <Typography variant="body1">
              У вас нет доступа к этому разделу.
            </Typography>
          </Box>
        </Container>
      );
  }
};

export default MyGrades; 