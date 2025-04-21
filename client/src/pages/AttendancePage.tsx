import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
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
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Chip,
  useTheme,
  SelectChangeEvent
} from '@mui/material';
import { 
  CalendarMonth, 
  People, 
  School,
  QrCode2, 
  Save
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Layout } from '../components/Layout';
import { QRCodeCanvas } from 'qrcode.react';
import { api } from '../services/api';

// Типы статусов посещаемости
enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  SICK = 'sick',
  EXCUSED = 'excused'
}

interface Student {
  student_id: string;
  name: string;
  status: AttendanceStatus;
}

interface Group {
  id: string;
  name: string;
  specialization: string;
  course: number;
}

interface Discipline {
  id: string;
  name: string;
  semester: number;
}

const AttendancePage: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedGroupName, setSelectedGroupName] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  const [selectedDisciplineName, setSelectedDisciplineName] = useState('');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [qrData, setQrData] = useState('');
  const [expiresIn, setExpiresIn] = useState(0);
  const [qrCountdown, setQrCountdown] = useState(0);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Загрузка списка групп при монтировании компонента
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setLoading(true);
        const response = await api.get('/attendance/groups');
        setGroups(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке групп:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, []);

  // Загрузка дисциплин при выборе группы
  useEffect(() => {
    if (selectedGroup) {
      const fetchDisciplines = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/attendance/disciplines?group_id=${selectedGroup}`);
          setDisciplines(response.data);
        } catch (error) {
          console.error('Ошибка при загрузке дисциплин:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchDisciplines();
      
      // Запоминаем название выбранной группы
      const group = groups.find(g => g.id === selectedGroup);
      if (group) {
        setSelectedGroupName(group.name);
      }
    }
  }, [selectedGroup, groups]);

  // Загрузка списка студентов и их посещаемости
  useEffect(() => {
    if (selectedGroupName && selectedDiscipline && selectedDate) {
      const fetchAttendance = async () => {
        try {
          setLoading(true);
          const response = await api.get(`/attendance/records`, {
            params: {
              group_name: selectedGroupName,
              discipline_id: selectedDiscipline,
              attendance_date: selectedDate
            }
          });
          
          setStudents(response.data.students);
          
          // Запоминаем название выбранной дисциплины
          const discipline = disciplines.find(d => d.id === selectedDiscipline);
          if (discipline) {
            setSelectedDisciplineName(discipline.name);
          }
        } catch (error) {
          console.error('Ошибка при загрузке данных о посещаемости:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchAttendance();
    }
  }, [selectedGroupName, selectedDiscipline, selectedDate, disciplines]);

  // Обновление обратного отсчета для QR-кода
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (qrDialogOpen && qrCountdown > 0) {
      timer = setInterval(() => {
        setQrCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [qrDialogOpen, qrCountdown]);

  const handleGroupChange = (event: SelectChangeEvent<string>) => {
    setSelectedGroup(event.target.value);
    setSelectedDiscipline('');
    setStudents([]);
  };

  const handleDisciplineChange = (event: SelectChangeEvent<string>) => {
    setSelectedDiscipline(event.target.value);
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  const handleStatusChange = (studentId: string, newStatus: AttendanceStatus) => {
    setStudents(prevStudents => 
      prevStudents.map(student => 
        student.student_id === studentId 
          ? { ...student, status: newStatus } 
          : student
      )
    );
  };

  const saveAttendance = async () => {
    try {
      setLoading(true);
      
      const attendanceData = students.map(student => ({
        student_id: student.student_id,
        discipline_id: selectedDiscipline,
        date: selectedDate,
        status: student.status
      }));
      
      await api.post('/attendance/update', attendanceData);
      setSaveSuccess(true);
      
      // Сбрасываем индикатор успеха через 3 секунды
      setTimeout(() => {
        setSaveSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Ошибка при сохранении данных о посещаемости:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    try {
      setLoading(true);
      
      const response = await api.post('/attendance/generate-qr', {
        group_name: selectedGroupName,
        discipline_id: selectedDiscipline,
        attendance_date: selectedDate
      });
      
      setQrData(response.data.qr_data);
      setExpiresIn(response.data.expires_in);
      setQrCountdown(response.data.expires_in);
      setQrDialogOpen(true);
    } catch (error) {
      console.error('Ошибка при генерации QR-кода:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseQrDialog = () => {
    setQrDialogOpen(false);
    setQrData('');
  };

  const refreshQRCode = () => {
    generateQRCode();
  };

  const getStatusChip = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return (
          <Chip 
            label="Присутствует" 
            color="success" 
            size="small"
            sx={{ fontWeight: 500 }}
          />
        );
      case AttendanceStatus.ABSENT:
        return (
          <Chip 
            label="Отсутствует" 
            color="error" 
            size="small"
            sx={{ fontWeight: 500 }}
          />
        );
      case AttendanceStatus.SICK:
        return (
          <Chip 
            label="Болен" 
            color="warning" 
            size="small"
            sx={{ fontWeight: 500 }}
          />
        );
      case AttendanceStatus.EXCUSED:
        return (
          <Chip 
            label="Уважительная" 
            color="info" 
            size="small"
            sx={{ fontWeight: 500 }}
          />
        );
      default:
        return null;
    }
  };

  const formatAttendanceStatus = (status: AttendanceStatus) => {
    switch (status) {
      case AttendanceStatus.PRESENT:
        return '1';
      case AttendanceStatus.ABSENT:
        return '0';
      case AttendanceStatus.SICK:
        return 'Б';
      case AttendanceStatus.EXCUSED:
        return 'У';
      default:
        return '';
    }
  };

  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Учет посещаемости
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Отмечайте посещаемость студентов на занятиях и генерируйте QR-коды для быстрой отметки
        </Typography>
      </Box>
      
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 4,
          borderRadius: 4,
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel id="group-select-label">Группа</InputLabel>
              <Select
                labelId="group-select-label"
                id="group-select"
                value={selectedGroup}
                onChange={handleGroupChange}
                label="Группа"
                startAdornment={<People sx={{ mr: 1, color: 'action.active' }} />}
                disabled={loading}
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
            <FormControl fullWidth variant="outlined">
              <InputLabel id="discipline-select-label">Дисциплина</InputLabel>
              <Select
                labelId="discipline-select-label"
                id="discipline-select"
                value={selectedDiscipline}
                onChange={handleDisciplineChange}
                label="Дисциплина"
                startAdornment={<School sx={{ mr: 1, color: 'action.active' }} />}
                disabled={loading || !selectedGroup}
              >
                {disciplines.map((discipline) => (
                  <MenuItem key={discipline.id} value={discipline.id}>
                    {discipline.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <FormControl fullWidth variant="outlined">
              <InputLabel htmlFor="date-select" shrink>
                Дата занятия
              </InputLabel>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarMonth sx={{ mr: 1, color: 'action.active' }} />
                <input
                  type="date"
                  id="date-select"
                  value={selectedDate}
                  onChange={handleDateChange}
                  disabled={loading}
                  style={{
                    padding: '16.5px 14px',
                    backgroundColor: 'transparent',
                    border: '1px solid rgba(0, 0, 0, 0.23)',
                    borderRadius: '4px',
                    width: '100%',
                    fontSize: '1rem',
                    fontFamily: 'inherit'
                  }}
                />
              </Box>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : students.length > 0 ? (
        <>
          <Paper 
            elevation={0}
            sx={{ 
              p: 3, 
              mb: 3,
              borderRadius: 4,
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" fontWeight={600}>
                Список студентов группы {selectedGroupName}
              </Typography>
              <Box>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<QrCode2 />}
                  onClick={generateQRCode}
                  sx={{ mr: 2, borderRadius: 2 }}
                >
                  Сгенерировать QR
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<Save />}
                  onClick={saveAttendance}
                  sx={{ borderRadius: 2 }}
                >
                  Сохранить
                </Button>
                {saveSuccess && (
                  <Chip
                    label="Сохранено"
                    color="success"
                    sx={{ ml: 2 }}
                  />
                )}
              </Box>
            </Box>
            
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>№</TableCell>
                    <TableCell>ФИО студента</TableCell>
                    <TableCell>Статус</TableCell>
                    <TableCell>Действия</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {students.map((student, index) => (
                    <TableRow key={student.student_id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{student.name}</TableCell>
                      <TableCell>
                        {getStatusChip(student.status)}
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            variant={student.status === AttendanceStatus.PRESENT ? "contained" : "outlined"}
                            color="success"
                            size="small"
                            onClick={() => handleStatusChange(student.student_id, AttendanceStatus.PRESENT)}
                            sx={{ minWidth: '40px', borderRadius: 2 }}
                          >
                            1
                          </Button>
                          <Button
                            variant={student.status === AttendanceStatus.ABSENT ? "contained" : "outlined"}
                            color="error"
                            size="small"
                            onClick={() => handleStatusChange(student.student_id, AttendanceStatus.ABSENT)}
                            sx={{ minWidth: '40px', borderRadius: 2 }}
                          >
                            0
                          </Button>
                          <Button
                            variant={student.status === AttendanceStatus.SICK ? "contained" : "outlined"}
                            color="warning"
                            size="small"
                            onClick={() => handleStatusChange(student.student_id, AttendanceStatus.SICK)}
                            sx={{ minWidth: '40px', borderRadius: 2 }}
                          >
                            Б
                          </Button>
                          <Button
                            variant={student.status === AttendanceStatus.EXCUSED ? "contained" : "outlined"}
                            color="info"
                            size="small"
                            onClick={() => handleStatusChange(student.student_id, AttendanceStatus.EXCUSED)}
                            sx={{ minWidth: '40px', borderRadius: 2 }}
                          >
                            У
                          </Button>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
          
          <Typography variant="body2" color="text.secondary">
            Условные обозначения: 1 - присутствует, 0 - отсутствует, Б - болеет, У - отсутствует по уважительной причине
          </Typography>
        </>
      ) : selectedGroupName && selectedDiscipline ? (
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            textAlign: 'center',
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Typography variant="h6">
            Студенты не найдены в группе {selectedGroupName}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Пожалуйста, проверьте выбранную группу или добавьте студентов в группу
          </Typography>
        </Paper>
      ) : (
        <Paper 
          elevation={0}
          sx={{ 
            p: 3, 
            textAlign: 'center',
            borderRadius: 4,
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <Typography variant="h6">
            Выберите группу, дисциплину и дату для отображения списка студентов
          </Typography>
        </Paper>
      )}
      
      {/* QR-код Dialog */}
      <Dialog
        open={qrDialogOpen}
        onClose={handleCloseQrDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
          QR-код для отметки посещаемости
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pt: 2 }}>
          {qrData && (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={600}>
                  {selectedDisciplineName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Группа: {selectedGroupName} • {format(new Date(selectedDate), 'd MMMM yyyy', { locale: ru })}
                </Typography>
              </Box>
              
              <Box 
                sx={{ 
                  display: 'inline-block', 
                  p: 3,
                  borderRadius: 2,
                  background: '#fff',
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
                  mb: 2
                }}
              >
                <QRCodeCanvas 
                  value={qrData} 
                  size={250}
                  level="H"
                  includeMargin={true}
                />
              </Box>
              
              <Typography variant="body2" color={qrCountdown > 30 ? "text.secondary" : "error"} fontWeight={600}>
                Код действителен: {Math.floor(qrCountdown / 60)}:{qrCountdown % 60 < 10 ? `0${qrCountdown % 60}` : qrCountdown % 60}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                Попросите студентов отсканировать этот QR-код для автоматической отметки посещаемости
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button 
            onClick={refreshQRCode} 
            variant="outlined" 
            sx={{ borderRadius: 2, mr: 1 }}
            disabled={loading}
          >
            Обновить QR-код
          </Button>
          <Button 
            onClick={handleCloseQrDialog} 
            variant="contained" 
            sx={{ borderRadius: 2 }}
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default AttendancePage; 