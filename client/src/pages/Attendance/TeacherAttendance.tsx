import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  SelectChangeEvent,
  CircularProgress
} from '@mui/material';
import { Close, QrCode2 } from '@mui/icons-material';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';

// Интерфейс для типизации записи посещаемости с сервера
interface AttendanceServerRecord {
  student_id: string;
  name: string;
  fullName?: string;
  status: string;
  updated_at?: string | null;
}

interface Group {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Student {
  id: string;  // Используем строку вместо числа для id
  fullName: string;
  status?: string;
}

interface AttendanceRecord {
  studentId: string;  // Используем строку вместо числа для studentId
  status: string;
}

const TeacherAttendance: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [openQRDialog, setOpenQRDialog] = useState<boolean>(false);
  const [qrValue, setQrValue] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  
  const navigate = useNavigate();

  // Загрузка групп при монтировании компонента
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/attendance/groups');
        console.log('Полученные группы:', response.data);
        setGroups(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке групп:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();
  }, []);

  // Загрузка предметов при выборе группы
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedGroup) return;
      
      try {
        setIsLoading(true);
        const response = await api.get(`/attendance/disciplines?group_id=${selectedGroup}`);
        setSubjects(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке предметов:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjects();
  }, [selectedGroup]);

  // Загрузка студентов при выборе группы
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedGroup) return;
      
      try {
        setIsLoading(true);
        const selectedGroupObj = groups.find(g => g.id === selectedGroup);
        if (!selectedGroupObj) {
          console.error('Группа не найдена по ID:', selectedGroup);
          setIsLoading(false);
          return;
        }
        
        const groupName = selectedGroupObj.name;
        console.log('Загрузка студентов для группы:', groupName);
        
        const response = await api.get(`/attendance/students?group_name=${groupName}`);
        console.log('Получены студенты:', response.data);
        
        // Убедимся, что ID студентов всегда строки
        setStudents(response.data.map((student: any) => ({
          ...student,
          id: student.id.toString(),  // Гарантированно строка
          status: 'Н'  // Н - отсутствует (по умолчанию)
        })));
      } catch (error) {
        console.error('Ошибка при загрузке студентов:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [selectedGroup, groups]);

  // Функция для загрузки данных о посещаемости
  const fetchAttendance = async () => {
    if (!selectedGroup || !selectedSubject || !selectedDate) return;
    
    try {
      setIsLoading(true);
      // Получаем имя группы по ID
      const selectedGroupObj = groups.find(g => g.id === selectedGroup);
      if (!selectedGroupObj) {
        console.error('Группа не найдена по ID:', selectedGroup);
        setIsLoading(false);
        return;
      }
      
      const groupName = selectedGroupObj.name;
      console.log('Запрос посещаемости для группы:', groupName, 'дисциплины:', selectedSubject, 'даты:', selectedDate);
      const response = await api.get(`/attendance/records`, {
        params: {
          group_name: groupName, // Используем имя группы вместо ID
          discipline_id: selectedSubject,
          attendance_date: selectedDate
        }
      });
      
      console.log('Получен ответ о посещаемости:', response.data);
      
      if (response.data && response.data.students && response.data.students.length > 0) {
        console.log('Найдено', response.data.students.length, 'записей о посещаемости');
        
        // Отладочная информация для диагностики проблемы с ID
        console.log('Имеющиеся студенты:');
        students.forEach(student => {
          console.log(`- ${student.fullName} [ID клиента: ${student.id}]`);
        });
        
        console.log('Записи посещаемости:');
        response.data.students.forEach((record: AttendanceServerRecord) => {
          console.log(`- ${record.fullName || record.name} [ID сервера: ${record.student_id}]`);
        });
        
        // Создаем карту записей посещаемости для быстрого поиска
        const attendanceMap = new Map<string, AttendanceServerRecord>();
        response.data.students.forEach((record: AttendanceServerRecord) => {
          attendanceMap.set(record.student_id, record);
        });
        
        // Обновляем статусы студентов из полученных данных
        const updatedStudents = students.map(student => {
          // Ищем запись в карте для этого студента
          const record = attendanceMap.get(student.id);
          
          let newStatus = 'Н'; // По умолчанию - отсутствует
          if (record) {
            newStatus = record.status;
            console.log(`✅ Найдено соответствие для ${student.fullName} - статус: ${newStatus}`);
          } else {
            console.log(`❌ Не найдено соответствие для ${student.fullName} с ID: ${student.id}`);
          }
          
          return {
            ...student,
            status: newStatus
          };
        });
        
        console.log('Обновленный список студентов:', updatedStudents);
        setStudents(updatedStudents);
        
        // Обновляем записи о посещаемости
        const newAttendanceRecords = response.data.students.map((record: AttendanceServerRecord) => ({
          studentId: record.student_id,
          status: record.status
        }));
        console.log('Новые записи посещаемости:', newAttendanceRecords);
        setAttendanceRecords(newAttendanceRecords);
      } else {
        console.log('Нет данных о посещаемости или пустой список студентов', response.data);
      }
    } catch (error) {
      console.error('Ошибка при загрузке данных о посещаемости:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Загрузка посещаемости при выборе даты, группы и предмета
  useEffect(() => {
    if (students.length > 0) {
      fetchAttendance();
    }
  }, [selectedGroup, selectedSubject, selectedDate, students.length]);

  // Настройка автоматического обновления
  useEffect(() => {
    // Очистка предыдущего таймера
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }

    // Создание нового таймера только когда все данные выбраны
    if (selectedGroup && selectedSubject && selectedDate) {
      autoRefreshRef.current = setInterval(() => {
        console.log('Автоматическое обновление данных посещаемости...');
        fetchAttendance();
      }, 5000); // Обновление каждые 5 секунд
    }

    // Очистка таймера при размонтировании компонента
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [selectedGroup, selectedSubject, selectedDate]);

  // Обработчики изменения выбранных значений
  const handleGroupChange = (event: SelectChangeEvent) => {
    setSelectedGroup(event.target.value);
    setSelectedSubject('');
  };

  const handleSubjectChange = (event: SelectChangeEvent) => {
    setSelectedSubject(event.target.value);
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  // Обработчик изменения статуса студента
  const handleStatusChange = (studentId: string, newStatus: string) => {
    // Обновляем список студентов
    const updatedStudents = students.map(student => 
      student.id === studentId ? { ...student, status: newStatus } : student
    );
    setStudents(updatedStudents);
    
    // Обновляем записи о посещаемости
    const existingRecordIndex = attendanceRecords.findIndex(record => record.studentId === studentId);
    
    if (existingRecordIndex !== -1) {
      const updatedRecords = [...attendanceRecords];
      updatedRecords[existingRecordIndex] = { ...updatedRecords[existingRecordIndex], status: newStatus };
      setAttendanceRecords(updatedRecords);
    } else {
      setAttendanceRecords([...attendanceRecords, { studentId, status: newStatus }]);
    }
  };

  // Сохранение данных о посещаемости
  const handleSaveAttendance = async () => {
    if (!selectedGroup || !selectedSubject || !selectedDate) {
      alert('Выберите группу, предмет и дату');
      return;
    }
    
    try {
      setIsLoading(true);
      await api.post('/attendance/update', 
        attendanceRecords.map(record => ({
          student_id: record.studentId,
          discipline_id: selectedSubject,
          date: selectedDate,
          status: record.status
        }))
      );
      
      alert('Данные о посещаемости сохранены');
    } catch (error) {
      console.error('Ошибка при сохранении данных о посещаемости:', error);
      alert('Ошибка при сохранении данных');
    } finally {
      setIsLoading(false);
    }
  };

  // Генерация QR-кода
  const handleGenerateQR = () => {
    if (!selectedGroup || !selectedSubject || !selectedDate) {
      alert('Выберите группу, предмет и дату');
      return;
    }
    
    // Получаем имя группы по ID
    const selectedGroupObj = groups.find(g => g.id === selectedGroup);
    if (!selectedGroupObj) {
      console.error('Группа не найдена по ID:', selectedGroup);
      alert('Ошибка: группа не найдена');
      return;
    }
    
    // Создаем объект с информацией для QR-кода
    const qrData = {
      groupId: selectedGroup,
      groupName: selectedGroupObj.name, // Добавляем имя группы
      subjectId: selectedSubject,
      date: selectedDate,
      timestamp: new Date().getTime()
    };
    
    console.log('Создаем QR-код с данными:', qrData);
    
    // Преобразуем объект в строку JSON
    const qrString = JSON.stringify(qrData);
    
    setQrValue(qrString);
    setOpenQRDialog(true);
  };

  // Добавим кнопку ручного обновления
  const handleRefresh = () => {
    fetchAttendance();
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Учет посещаемости
      </Typography>
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel id="group-select-label">Группа</InputLabel>
              <Select
                labelId="group-select-label"
                id="group-select"
                value={selectedGroup}
                label="Группа"
                onChange={handleGroupChange}
              >
                {groups.length > 0 ? (
                  groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled value="">
                    Нет доступных групп
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth disabled={!selectedGroup}>
              <InputLabel id="subject-select-label">Предмет</InputLabel>
              <Select
                labelId="subject-select-label"
                id="subject-select"
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
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel htmlFor="date-input" shrink>
                Дата
              </InputLabel>
              <Box sx={{ pt: 2 }}>
                <input
                  type="date"
                  id="date-input"
                  value={selectedDate}
                  onChange={handleDateChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                />
              </Box>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              disabled={!selectedGroup || !selectedSubject || isLoading}
              onClick={handleGenerateQR}
              startIcon={<QrCode2 />}
            >
              QR-код
            </Button>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              color="info"
              fullWidth
              disabled={!selectedGroup || !selectedSubject || isLoading}
              onClick={handleRefresh}
            >
              Обновить
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {students.length > 0 ? (
            <>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                Найдено студентов: {students.length}. 
                Присутствуют: {students.filter(s => s.status === 'П').length}.
                Отсутствуют: {students.filter(s => s.status === 'Н').length}.
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>№</TableCell>
                      <TableCell>ФИО студента</TableCell>
                      <TableCell align="center">Статус</TableCell>
                      <TableCell align="center">Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((student, index) => {
                      console.log(`Отображение студента: ${student.fullName}, ID: ${student.id}, Статус: ${student.status || 'не указан'}`);
                      return (
                        <TableRow key={student.id}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{student.fullName}</TableCell>
                          <TableCell align="center">
                            <Box
                              sx={{
                                display: 'inline-block',
                                fontWeight: 'bold',
                                color: student.status === 'П' ? 'success.main' : 
                                      student.status === 'Н' ? 'error.main' : 
                                      student.status === 'Б' ? 'warning.main' : 'text.secondary'
                              }}
                            >
                              {student.status}
                            </Box>
                          </TableCell>
                          <TableCell align="center">
                            <Button
                              variant="outlined"
                              color="success"
                              size="small"
                              onClick={() => handleStatusChange(student.id, 'П')}
                              sx={{ mx: 0.5 }}
                            >
                              П
                            </Button>
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => handleStatusChange(student.id, 'Н')}
                              sx={{ mx: 0.5 }}
                            >
                              Н
                            </Button>
                            <Button
                              variant="outlined"
                              color="warning"
                              size="small"
                              onClick={() => handleStatusChange(student.id, 'Б')}
                              sx={{ mx: 0.5 }}
                            >
                              Б
                            </Button>
                            <Button
                              variant="outlined"
                              color="info"
                              size="small"
                              onClick={() => handleStatusChange(student.id, 'У')}
                              sx={{ mx: 0.5 }}
                            >
                              У
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : selectedGroup ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography>Нет данных о студентах для выбранной группы</Typography>
            </Paper>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography>Выберите группу, предмет и дату для отображения списка студентов</Typography>
            </Paper>
          )}
          
          {students.length > 0 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveAttendance}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Сохранить'}
              </Button>
            </Box>
          )}
        </>
      )}
      
      {/* Диалог с QR-кодом */}
      <Dialog
        open={openQRDialog}
        onClose={() => setOpenQRDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
            <IconButton onClick={() => setOpenQRDialog(false)}>
              <Close />
            </IconButton>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh'
          }}>
            <Typography variant="h6" gutterBottom>
              QR-код для отметки посещаемости
            </Typography>
            
            <Typography variant="body2" gutterBottom color="text.secondary">
              {groups.find(g => g.id === selectedGroup)?.name} | 
              {subjects.find(s => s.id === selectedSubject)?.name} | 
              {new Date(selectedDate).toLocaleDateString()}
            </Typography>
            
            <Box sx={{ 
              p: 2, 
              border: '1px solid #eee', 
              borderRadius: 2,
              backgroundColor: '#fff',
              mt: 2
            }}>
              <QRCodeCanvas 
                value={qrValue}
                size={256}
                level="H"
                includeMargin={true}
              />
            </Box>
            
            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
              Покажите этот QR-код студентам или выведите его на экран для сканирования
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQRDialog(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeacherAttendance; 