import React from 'react';
import { Box, Container, Typography } from '@mui/material';
import { LoginForm } from '../../components/Auth';
import { School } from '@mui/icons-material';

const LoginPage: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F5F5F7',
        backgroundImage: 'linear-gradient(135deg, rgba(220, 235, 255, 0.3) 0%, rgba(255, 255, 255, 0.5) 100%)',
        py: 5,
      }}
    >
      <Container maxWidth="sm">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: 5,
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 2,
            }}
          >
            <School
              color="primary"
              sx={{
                fontSize: 40,
                mr: 1,
              }}
            />
            <Typography
              variant="h4"
              component="h1"
              fontWeight={600}
              color="primary"
              sx={{ letterSpacing: '-0.5px' }}
            >
              КПиУС ДВФУ
            </Typography>
          </Box>
          <Typography
            variant="subtitle1"
            color="text.secondary"
            align="center"
            mb={4}
          >
            Система контроля посещаемости и успеваемости студентов
          </Typography>
        </Box>

        <LoginForm />
      </Container>
    </Box>
  );
};

export default LoginPage; 