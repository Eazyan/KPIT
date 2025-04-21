import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Paper,
  Container,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';
import { UserRole } from '../../types';

const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<string>(UserRole.STUDENT);
  const [group, setGroup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const { register } = useContext(AuthContext);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      await register({
        name,
        email,
        password,
        role,
        group: role === UserRole.STUDENT ? group : undefined
      });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };
  
  const handleRoleChange = (event: SelectChangeEvent) => {
    setRole(event.target.value);
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
              Регистрация
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Создайте новую учетную запись
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
              label="ФИО"
              value={name}
              onChange={(e) => setName(e.target.value)}
              margin="normal"
              required
              autoFocus
              variant="outlined"
            />
            
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
              variant="outlined"
            />
            
            <FormControl fullWidth margin="normal">
              <InputLabel id="role-select-label">Роль</InputLabel>
              <Select
                labelId="role-select-label"
                id="role-select"
                value={role}
                label="Роль"
                onChange={handleRoleChange}
              >
                <MenuItem value={UserRole.STUDENT}>Студент</MenuItem>
                <MenuItem value={UserRole.TEACHER}>Преподаватель</MenuItem>
              </Select>
            </FormControl>
            
            {role === UserRole.STUDENT && (
              <TextField
                fullWidth
                label="Группа"
                value={group}
                onChange={(e) => setGroup(e.target.value)}
                margin="normal"
                required
                variant="outlined"
              />
            )}
            
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
            
            <TextField
              fullWidth
              label="Подтверждение пароля"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </Button>
            
            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Уже есть аккаунт?{' '}
                <Link to="/login" style={{ color: '#1976d2', textDecoration: 'none' }}>
                  Войти
                </Link>
              </Typography>
            </Box>
          </form>
        </Paper>
      </Container>
    </Box>
  );
};

export default RegisterPage; 