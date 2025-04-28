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
  Button,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Alert,
  SelectChangeEvent
} from '@mui/material';
import { AuthContext } from '../../context/AuthContext';
import { UserRole, Grade, Discipline } from '../../types';
import { Navigate } from 'react-router-dom';

// Компонент страницы оценок для преподавателя
const TeacherGrades: React.FC = () => {
  const { user, loading } = useContext(AuthContext);
  const [loadingData, setLoadingData] = useState(false);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('');
  const [grades, setGrades] = useState<Grade[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [newGrade, setNewGrade] = useState({
    student: '',
    score: 0,
    type: 'Экзамен',
    comment: '',
    weight: 1
  });
  const [students, setStudents] = useState<any[]>([]);

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

  if (user.role !== UserRole.TEACHER) {
    return <Navigate to="/grades" />;
  }

  // Обработчики для формы добавления новой оценки
  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewGrade(prev => ({ ...prev, [name]: name === 'score' || name === 'weight' ? Number(value) : value }));
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    setNewGrade(prev => ({ ...prev, student: e.target.value }));
  };

  const handleTypeChange = (e: SelectChangeEvent) => {
    setNewGrade(prev => ({ ...prev, type: e.target.value }));
  };

  const handleAddGrade = () => {
    // Здесь должен быть запрос к API для добавления оценки
    // В этом примере просто закрываем диалог
    handleCloseDialog();
  };

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Журнал оценок преподавателя
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
            <FormControl fullWidth sx={{ mr: 2 }}>
              <InputLabel id="discipline-select-label">Дисциплина</InputLabel>
              <Select
                labelId="discipline-select-label"
                value={selectedDiscipline}
                label="Дисциплина"
                onChange={(e) => setSelectedDiscipline(e.target.value)}
              >
                {disciplines.map((discipline) => (
                  <MenuItem key={discipline._id} value={discipline._id}>
                    {discipline.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleOpenDialog}
              disabled={!selectedDiscipline}
            >
              Добавить оценку
            </Button>
          </Box>
          
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
                      <TableCell>{grade.student}</TableCell>
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
      </Box>
      
      {/* Диалог добавления оценки */}
      <Dialog open={openDialog} onClose={handleCloseDialog}>
        <DialogTitle>Добавить новую оценку</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel id="student-select-label">Студент</InputLabel>
            <Select
              labelId="student-select-label"
              value={newGrade.student}
              label="Студент"
              onChange={handleSelectChange}
            >
              {students.map((student) => (
                <MenuItem key={student._id} value={student._id}>
                  {student.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel id="type-select-label">Тип оценки</InputLabel>
            <Select
              labelId="type-select-label"
              value={newGrade.type}
              label="Тип оценки"
              onChange={handleTypeChange}
            >
              <MenuItem value="Экзамен">Экзамен</MenuItem>
              <MenuItem value="Зачет">Зачет</MenuItem>
              <MenuItem value="Контрольная">Контрольная</MenuItem>
              <MenuItem value="Лабораторная">Лабораторная</MenuItem>
              <MenuItem value="Домашняя работа">Домашняя работа</MenuItem>
            </Select>
          </FormControl>
          
          <TextField
            fullWidth
            margin="dense"
            name="score"
            label="Оценка"
            type="number"
            value={newGrade.score}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            margin="dense"
            name="weight"
            label="Вес оценки"
            type="number"
            value={newGrade.weight}
            onChange={handleInputChange}
            sx={{ mb: 2 }}
          />
          
          <TextField
            fullWidth
            margin="dense"
            name="comment"
            label="Комментарий"
            multiline
            rows={2}
            value={newGrade.comment}
            onChange={handleInputChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Отмена</Button>
          <Button onClick={handleAddGrade} variant="contained" color="primary">
            Добавить
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeacherGrades; 