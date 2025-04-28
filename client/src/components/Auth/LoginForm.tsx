import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TextField,
  Button,
  Box,
  Typography,
  Card,
  CardContent,
  InputAdornment,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Visibility, VisibilityOff, Lock, Email } from '@mui/icons-material';
import { AuthContext } from '../../context/AuthContext';

const LoginForm: React.FC = () => {
  const navigate = useNavigate();
  const { login, error, loading } = useContext(AuthContext);
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setFormError(null); // Сбрасываем ошибку при изменении данных
  };
  
  const handleTogglePasswordVisibility = () => {
    setShowPassword((prevShowPassword) => !prevShowPassword);
  };
  
  const validateForm = () => {
    if (!formData.email) {
      setFormError('Пожалуйста, введите email');
      return false;
    }
    
    if (!formData.password) {
      setFormError('Пожалуйста, введите пароль');
      return false;
    }
    
    return true;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (error: any) {
      console.error('Ошибка при входе:', error);
      let errorMessage = 'Ошибка при входе в систему. Проверьте данные и попробуйте снова.';
      
      if (error.response?.data?.detail) {
        if (Array.isArray(error.response.data.detail)) {
          errorMessage = error.response.data.detail.map((err: any) => err.msg).join(', ');
        } else {
          errorMessage = error.response.data.detail;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setFormError(errorMessage);
    }
  };
  
  return (
    <Card 
      elevation={0}
      sx={{ 
        maxWidth: 450,
        borderRadius: 4,
        backdropFilter: 'blur(20px)',
        background: 'rgba(255, 255, 255, 0.7)',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)',
      }}
    >
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={600} mb={1}>
          Вход в систему
        </Typography>
        
        <Typography variant="body2" color="text.secondary" mb={4}>
          Введите свои учетные данные для входа в КПиУС ДВФУ
        </Typography>
        
        {(error || formError) && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {formError || error}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            margin="normal"
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Email color="action" />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            label="Пароль"
            name="password"
            type={showPassword ? 'text' : 'password'}
            value={formData.password}
            onChange={handleChange}
            margin="normal"
            required
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Lock color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="toggle password visibility"
                    onClick={handleTogglePasswordVisibility}
                    edge="end"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
            }}
            sx={{ mb: 3 }}
          />
          
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={loading}
            sx={{
              py: 1.5,
              mb: 2,
              borderRadius: 3,
              textTransform: 'none',
              boxShadow: 'none',
              fontSize: '1rem'
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Войти'}
          </Button>
          
          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Не зарегистрированы?{' '}
              <Button 
                color="primary" 
                onClick={() => navigate('/register')}
                sx={{ textTransform: 'none', fontWeight: 600, p: 0 }}
              >
                Создать аккаунт
              </Button>
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default LoginForm; 