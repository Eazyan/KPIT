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
  Button,
  Snackbar,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Grid,
  Card,
  CardContent,
  Chip
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import EditIcon from '@mui/icons-material/Edit';
import QrCodeIcon from '@mui/icons-material/QrCode';

const TeacherAttendance = () => {
  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [attendance, setAttendance] = useState([]);
  const [students, setStudents] = useState([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [qrDialogOpen, setQrDialogOpen] = useState(false);

  // Имитация загрузки предметов
  useEffect(() => {
    setSubjects([
      { id: 'prog', name: 'Программирование' },
      { id: 'db', name: 'Базы данных' },
      { id: 'web', name: 'Web-технологии' }
    ]);
  }, []);

  // Имитация загрузки групп при выборе предмета
  useEffect(() => {
    if (selectedSubject) {
      setGroups([
        { id: 'group1', name: 'ПИ-101' },
        { id: 'group2', name: 'ИВТ-202' },
        { id: 'group3', name: 'ИС-303' }
      ]);
      setSelectedGroup('');
    } else {
      setGroups([]);
    }
  }, [selectedSubject]);

  // Имитация загрузки студентов и данных о посещаемости
  useEffect(() => {
    if (selectedGroup && selectedSubject) {
      setIsLoading(true);
      setError(null);
      
      setTimeout(() => {
        try {
          // Генерация списка студентов
          const mockStudents = [];
          for (let i = 1; i <= 15; i++) {
            mockStudents.push({
              id: `student-${i}`,
              name: `Студент ${i}`,
              group: selectedGroup
            });
          }
          
          setStudents(mockStudents);
          
          // Генерация данных о посещаемости на сегодня
          const mockAttendance = mockStudents.map(student => ({
            id: `att-${student.id}-${date}`,
            studentId: student.id,
            date: date,
            status: Math.random() > 0.2 ? 'present' : 'absent',
            subject: selectedSubject
          }));
          
          setAttendance(mockAttendance);
          setIsLoading(false);
        } catch (err) {
          setError('Произошла ошибка при загрузке данных');
          setIsLoading(false);
        }
      }, 1000);
    }
  }, [selectedGroup, selectedSubject, date]);

  const handleSubjectChange = (event) => {
    setSelectedSubject(event.target.value);
  };

  const handleGroupChange = (event) => {
    setSelectedGroup(event.target.value);
  };

  const handleDateChange = (event) => {
    setDate(event.target.value);
  };

  const handleStatusChange = (studentId, newStatus) => {
    setAttendance(prev => 
      prev.map(record => 
        record.studentId === studentId 
          ? { ...record, status: newStatus } 
          : record
      )
    );
  };

  const saveAttendance = () => {
    // Имитация сохранения данных
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setSaveSuccess(true);
    }, 1000);
  };

  const generateQrCode = () => {
    setQrDialogOpen(true);
  };

  const closeQrDialog = () => {
    setQrDialogOpen(false);
  };

  const handleCloseSnackbar = () => {
    setSaveSuccess(false);
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

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" gutterBottom>
          Учет посещаемости
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
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
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth disabled={!selectedSubject}>
                <InputLabel id="group-select-label">Группа</InputLabel>
                <Select
                  labelId="group-select-label"
                  value={selectedGroup}
                  label="Группа"
                  onChange={handleGroupChange}
                >
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <FormControl fullWidth>
                <input
                  type="date"
                  value={date}
                  onChange={handleDateChange}
                  className="MuiOutlinedInput-input"
                  style={{ 
                    height: '56px', 
                    width: '100%', 
                    padding: '16.5px 14px',
                    border: '1px solid rgba(0, 0, 0, 0.23)',
                    borderRadius: '4px'
                  }}
                />
              </FormControl>
            </Grid>
          </Grid>
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
        ) : selectedGroup && selectedSubject ? (
          <>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h5">
                Список студентов
              </Typography>
              <Box>
                <Button 
                  variant="contained" 
                  color="primary" 
                  startIcon={<SaveIcon />}
                  onClick={saveAttendance}
                  sx={{ mr: 2 }}
                >
                  Сохранить
                </Button>
                <Button 
                  variant="outlined" 
                  color="secondary" 
                  startIcon={<QrCodeIcon />}
                  onClick={generateQrCode}
                >
                  Генерировать QR-код
                </Button>
              </Box>
            </Box>
            
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>№</TableCell>
                    <TableCell>Имя студента</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student, index) => {
                    const attendanceRecord = attendance.find(a => a.studentId === student.id);
                    return (
                      <TableRow key={student.id}>
                        <TableCell>{index + 1}</TableCell>
                        <TableCell>{student.name}</TableCell>
                        <TableCell>
                          {attendanceRecord && getStatusLabel(attendanceRecord.status)}
                        </TableCell>
                        <TableCell>
                          <IconButton 
                            color="primary" 
                            aria-label="изменить статус"
                            onClick={() => handleStatusChange(
                              student.id, 
                              attendanceRecord?.status === 'present' ? 'absent' : 'present'
                            )}
                          >
                            <EditIcon />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </>
        ) : (
          <Typography variant="body1" sx={{ textAlign: 'center', p: 3 }}>
            Выберите предмет и группу для отметки посещаемости
          </Typography>
        )}
      </Box>
      
      <Snackbar 
        open={saveSuccess} 
        autoHideDuration={6000} 
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity="success">
          Данные о посещаемости успешно сохранены!
        </Alert>
      </Snackbar>
      
      <Dialog open={qrDialogOpen} onClose={closeQrDialog}>
        <DialogTitle>QR-код для отметки посещаемости</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Студенты могут сканировать этот QR-код для отметки посещаемости:
          </DialogContentText>
          <Box sx={{ 
            width: '200px', 
            height: '200px', 
            background: 'grey', 
            margin: '20px auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <QrCodeIcon sx={{ fontSize: 100, color: 'white' }} />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeQrDialog} color="primary">
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeacherAttendance; 