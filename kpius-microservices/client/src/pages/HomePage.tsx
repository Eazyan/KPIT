import React from 'react';
import { Box, Typography, Paper, Grid, Container } from '@mui/material';

const HomePage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Система контроля посещаемости и успеваемости ДВФУ
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" paragraph>
          Микросервисная версия
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              borderRadius: 2,
              boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            }}
          >
            <Typography variant="h5" gutterBottom>
              Учет посещаемости
            </Typography>
            <Typography>
              Отслеживайте посещаемость занятий, получайте статистику и отчеты.
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper
            sx={{
              p: 3,
              height: '100%',
              borderRadius: 2,
              boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #fff1eb 0%, #ace0f9 100%)',
            }}
          >
            <Typography variant="h5" gutterBottom>
              Мониторинг успеваемости
            </Typography>
            <Typography>
              Ведите учет оценок, анализируйте успеваемость студентов.
            </Typography>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default HomePage; 