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
  Alert,
  Grid,
  Card,
  CardContent,
  SelectChangeEvent
} from '@mui/material';
import { AuthContext } from '../../context/AuthContext';
import { UserRole, Grade, Discipline } from '../../types';
import { Navigate } from 'react-router-dom';

// Компонент страницы оценок для студента
const StudentGrades: React.FC = () => {
  const { user, loading } = useContext(AuthContext);
  const [loadingData, setLoadingData] = useState(false);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [averageScore, setAverageScore] = useState<number>(0);

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

  if (user.role !== UserRole.STUDENT) {
    return <Navigate to="/grades" />;
  }

  // Функция для расчета среднего балла
  const calculateAverageScore = (gradesList: Grade[]): number => {
    if (gradesList.length === 0) return 0;
    
    let totalWeight = 0;
    let weightedSum = 0;
    
    gradesList.forEach(grade => {
      totalWeight += grade.weight;
      weightedSum += grade.score * grade.weight;
    });
    
    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  };

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
      setAverageScore(0);
    }, 1000);
  };

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Мои оценки
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3, height: '100%' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Средний балл
                </Typography>
                <Typography variant="h3" color="primary" sx={{ fontWeight: 'bold' }}>
                  {averageScore.toFixed(1)}
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {selectedDiscipline ? 
                    "По выбранной дисциплине" : 
                    "Выберите дисциплину для просмотра среднего балла"}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3, mb: 3 }}>
              <FormControl fullWidth sx={{ mb: 3 }}>
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
              
              {loadingData ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : grades.length > 0 ? (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Тип</TableCell>
                        <TableCell>Оценка</TableCell>
                        <TableCell>Дата</TableCell>
                        <TableCell>Комментарий</TableCell>
                        <TableCell>Вес</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grades.map((grade) => (
                        <TableRow key={grade._id}>
                          <TableCell>{grade.type}</TableCell>
                          <TableCell>{grade.score}</TableCell>
                          <TableCell>{new Date(grade.date).toLocaleDateString()}</TableCell>
                          <TableCell>{grade.comment}</TableCell>
                          <TableCell>{grade.weight}</TableCell>
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

export default StudentGrades; 