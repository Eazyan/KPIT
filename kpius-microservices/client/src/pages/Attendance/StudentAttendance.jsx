import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Alert,
  Chip
} from '@mui/material';

const StudentAttendance = () => {
  const [subjects, setSubjects] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Имитация загрузки предметов
  useEffect(() => {
    setSubjects([
      { id: 'prog', name: 'Программирование' },
      { id: 'db', name: 'Базы данных' },
      { id: 'web', name: 'Web-технологии' }
    ]);
  }, []);

  // Имитация загрузки данных о посещаемости
  useEffect(() => {
    if (selectedSubject) {
      setIsLoading(true);
      setError(null);
      
      setTimeout(() => {
        try {
          // Генерация данных о посещаемости
          const mockAttendance = [];
          const today = new Date();
          
          for (let i = 0; i < 10; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i * 3);
            
            mockAttendance.push({
              id: `att-${i}`,
              date: date.toISOString().split('T')[0],
              status: Math.random() > 0.2 ? 'present' : 'absent'
            });
          }
          
          setAttendance(mockAttendance);
          setIsLoading(false);
        } catch (err) {
          setError('Произошла ошибка при загрузке данных');
          setIsLoading(false);
        }
      }, 1000);
    }
  }, [selectedSubject]);

  const handleSubjectChange = (event) => {
    setSelectedSubject(event.target.value);
  };

  const formatDate = (dateString) => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('ru-RU', options);
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'present':
        return <Chip label="Присутствует" color="success" size="small" />;
      case 'absent':
        return <Chip label="Отсутствует" color="error" size="small" />;
      case 'late':
        return <Chip label="Опоздал" color="warning" size="small" />;
      case 'excused':
        return <Chip label="Уважительная причина" color="info" size="small" />;
      default:
        return <Chip label="Неизвестно" size="small" />;
    }
  };

  // Расчет статистики посещаемости
  const calculateStats = () => {
    if (!attendance.length) return { total: 0, present: 0, absent: 0, percentage: 0 };
    
    const present = attendance.filter(a => a.status === 'present').length;
    const total = attendance.length;
    
    return {
      total,
      present,
      absent: total - present,
      percentage: Math.round((present / total) * 100)
    };
  };

  const stats = calculateStats();

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" gutterBottom>
          Моя посещаемость
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel id="subject-select-label">Предмет</InputLabel>
            <Select
              labelId="subject-select-label"
              value={selectedSubject}
              label="Предмет"
              onChange={handleSubjectChange}
            >
              {subjects.map((subject) => (
                <MenuItem key={subject.id} value={subject.id}>
                  {subject.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Paper>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
            <CircularProgress />
          </Box>
        ) : selectedSubject && attendance.length > 0 ? (
          <>
            {/* Статистика посещаемости */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Статистика посещаемости
                </Typography>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Paper sx={{ p: 2, flex: '1 1 200px', textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {stats.percentage}%
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Общий процент посещаемости
                    </Typography>
                  </Paper>
                  
                  <Paper sx={{ p: 2, flex: '1 1 150px', textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {stats.present}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Присутствовал
                    </Typography>
                  </Paper>
                  
                  <Paper sx={{ p: 2, flex: '1 1 150px', textAlign: 'center' }}>
                    <Typography variant="h4" color="error.main">
                      {stats.absent}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Отсутствовал
                    </Typography>
                  </Paper>
                </Box>
              </CardContent>
            </Card>
          
            {/* Таблица с данными о посещаемости */}
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Дата</TableCell>
                    <TableCell>Статус</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {attendance.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{formatDate(record.date)}</TableCell>
                      <TableCell>{getStatusLabel(record.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <Typography variant="body1" sx={{ textAlign: 'center', p: 3 }}>
            Выберите предмет для просмотра данных о посещаемости
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default StudentAttendance; 