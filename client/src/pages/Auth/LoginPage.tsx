import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper,
  Container,
  Alert,
  CircularProgress
} from '@mui/material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user } = useContext(AuthContext);

  // Если пользователь уже авторизован, перенаправляем на главную
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
  
  // Очищаем ошибку при изменении полей
  useEffect(() => {
    if (error) {
      setError(null);
    }
  }, [email, password]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Предотвращаем повторные отправки формы
    if (isSubmitting) return;
    
    setLoading(true);
    setError(null);
    setIsSubmitting(true);
    
    try {
      console.log('Попытка входа:', { email });
      await login(email, password);
      console.log('Вход успешен, перенаправление на главную страницу');
      navigate('/');
    } catch (err: any) {
      console.error('Ошибка при входе:', err);
      let errorMessage = 'Ошибка при входе в систему. Проверьте данные и попробуйте снова.';
      
      if (err.response?.data?.detail) {
        if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map((error: any) => error.msg).join(', ');
        } else {
          errorMessage = err.response.data.detail;
        }
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
      setIsSubmitting(false);
    }
  };
  
  return (
    <Box 
      sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        alignItems: 'center', 
        justifyContent: 'center',
        bgcolor: '#f5f5f5'
      }}
    >
      <Container maxWidth="sm">
        <Paper 
          elevation={0}
          sx={{ 
            p: 4, 
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Box textAlign="center" mb={4}>
            <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
              КПиУС ДВФУ
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Система контроля посещаемости и успеваемости
            </Typography>
          </Box>
          
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}
          
          <form onSubmit={handleSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              autoFocus
              variant="outlined"
              disabled={loading}
            />
            
            <TextField
              fullWidth
              label="Пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
              variant="outlined"
              disabled={loading}
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading || isSubmitting}
              sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: 2 }}
            >
              {loading ? (
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CircularProgress size={24} sx={{ mr: 1 }} color="inherit" />
                  Вход...
                </Box>
              ) : 'Войти'}
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage; 