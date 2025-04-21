import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper,
  Container,
  Alert
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    setError(null);
    
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при входе в систему');
    } finally {
      setLoading(false);
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
            />
            
            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.5, borderRadius: 2 }}
            >
              {loading ? 'Вход...' : 'Войти'}
            </Button>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default LoginPage; 