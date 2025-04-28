import React, { useState, useEffect, useContext } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Alert,
  Grid,
  Card,
  CardContent,
  SelectChangeEvent,
  IconButton
} from '@mui/material';
import { AuthContext } from '../../context/AuthContext';
import { UserRole, Grade, Discipline } from '../../types';
import { Navigate } from 'react-router-dom';

// Компонент страницы оценок для администратора
const AdminGrades: React.FC = () => {
  const { user, loading } = useContext(AuthContext);
  const [loadingData, setLoadingData] = useState(false);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Проверка авторизации и роли
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (user.role !== UserRole.ADMIN && user.role !== UserRole.HEAD_OF_DEPARTMENT) {
    return <Navigate to="/grades" />;
  }

  // Обработчик изменения выбранной дисциплины
  const handleDisciplineChange = (e: SelectChangeEvent) => {
    setSelectedDiscipline(e.target.value);
    // В реальном приложении здесь должен быть запрос к API
    setLoadingData(true);
    // Имитация загрузки данных
    setTimeout(() => {
      setLoadingData(false);
      // Пустые данные для примера
      setGrades([]);
    }, 1000);
  };

  // Функция для экспорта данных (заглушка)
  const handleExportData = () => {
    alert('Экспорт данных (функция будет реализована)');
  };

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Управление оценками
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="subtitle1" color="text.secondary">
            Панель администратора для управления оценками студентов
          </Typography>
          
          <Button 
            variant="outlined" 
            color="primary" 
            onClick={handleExportData}
          >
            Экспорт данных
          </Button>
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Фильтры
                </Typography>
                
                <FormControl fullWidth sx={{ mb: 2 }}>
                  <InputLabel id="discipline-select-label">Дисциплина</InputLabel>
                  <Select
                    labelId="discipline-select-label"
                    value={selectedDiscipline}
                    label="Дисциплина"
                    onChange={handleDisciplineChange}
                  >
                    {disciplines.map((discipline) => (
                      <MenuItem key={discipline._id} value={discipline._id}>
                        {discipline.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                
                <TextField
                  fullWidth
                  label="Поиск студента"
                  variant="outlined"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  sx={{ mb: 2 }}
                />
              </CardContent>
            </Card>
            
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Статистика
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Всего оценок: {grades.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Средний балл: {grades.length > 0 
                    ? (grades.reduce((sum, grade) => sum + grade.score, 0) / grades.length).toFixed(1) 
                    : "Н/Д"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Журнал оценок
              </Typography>
              
              {loadingData ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : grades.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Студент</TableCell>
                        <TableCell>Дисциплина</TableCell>
                        <TableCell>Тип</TableCell>
                        <TableCell>Оценка</TableCell>
                        <TableCell>Дата</TableCell>
                        <TableCell>Действия</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grades.map((grade) => (
                        <TableRow key={grade._id}>
                          <TableCell>{grade.student}</TableCell>
                          <TableCell>{grade.discipline}</TableCell>
                          <TableCell>{grade.type}</TableCell>
                          <TableCell>{grade.score}</TableCell>
                          <TableCell>{new Date(grade.date).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <IconButton size="small" color="primary">
                              Ред.
                            </IconButton>
                            <IconButton size="small" color="error">
                              Удал.
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography variant="body1" sx={{ textAlign: 'center', py: 3 }}>
                  {selectedDiscipline ? "Оценки не найдены" : "Выберите дисциплину для просмотра оценок"}
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default AdminGrades; 