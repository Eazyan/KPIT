import React, { useState, useEffect } from 'react';
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
  SelectChangeEvent,
  CircularProgress,
  Divider,
  Alert,
  Tabs,
  Tab,
  Chip
} from '@mui/material';
import { Download, BarChart, People, DateRange } from '@mui/icons-material';
import { api } from '../../services/api';

interface Group {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Student {
  id: string;
  fullName: string;
}

interface AttendanceRecord {
  studentId: string;
  studentName: string;
  status: string;
  date: string;
  subjectId: string;
  subjectName: string;
}

interface AttendanceStatistics {
  totalClasses: number;
  attendanceByStudent: {
    studentId: string;
    studentName: string;
    presentCount: number;
    absentCount: number;
    sickCount: number;
    excusedCount: number;
    attendanceRate: number;
  }[];
  overallAttendanceRate: number;
}

const AdminAttendance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<number>(0);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedStartDate, setSelectedStartDate] = useState<string>(
    new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0]
  );
  const [selectedEndDate, setSelectedEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [statistics, setStatistics] = useState<AttendanceStatistics | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка групп при монтировании компонента
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/groups');
        setGroups(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке групп:', error);
        setError('Не удалось загрузить список групп');
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
        const response = await api.get(`/subjects/by-group/${selectedGroup}`);
        setSubjects(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке предметов:', error);
        setError('Не удалось загрузить список предметов');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSubjects();
    setSelectedSubject('');
  }, [selectedGroup]);

  // Загрузка студентов при выборе группы
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedGroup) return;
      
      try {
        setIsLoading(true);
        const response = await api.get(`/students/by-group/${selectedGroup}`);
        setStudents(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке студентов:', error);
        setError('Не удалось загрузить список студентов');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [selectedGroup]);

  // Загрузка данных о посещаемости при изменении параметров
  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!selectedGroup || !selectedStartDate || !selectedEndDate) return;
      
      try {
        setIsLoading(true);
        let url = `/attendance/analytics`;
        const params = {
          groupId: selectedGroup,
          startDate: selectedStartDate,
          endDate: selectedEndDate
        };
        
        if (selectedSubject) {
          params['subjectId' as keyof typeof params] = selectedSubject;
        }
        
        const response = await api.get(url, { params });
        
        if (response.data) {
          setAttendanceRecords(response.data.records || []);
          
          // Вычисление статистики
          const studentStats = (response.data.students || []).map((student: any) => {
            const studentRecords = response.data.records.filter(
              (r: any) => r.studentId === student.id
            );
            
            const presentCount = studentRecords.filter((r: any) => r.status === 'П').length;
            const absentCount = studentRecords.filter((r: any) => r.status === 'Н').length;
            const sickCount = studentRecords.filter((r: any) => r.status === 'Б').length;
            const excusedCount = studentRecords.filter((r: any) => r.status === 'У').length;
            const totalClasses = studentRecords.length;
            
            return {
              studentId: student.id,
              studentName: student.fullName,
              presentCount,
              absentCount,
              sickCount,
              excusedCount,
              attendanceRate: totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0
            };
          });
          
          const totalPresent = studentStats.reduce((sum: number, student: {presentCount: number}) => sum + student.presentCount, 0);
          const totalClasses = studentStats.reduce((sum: number, student: {presentCount: number, absentCount: number, sickCount: number, excusedCount: number}) => 
            sum + student.presentCount + student.absentCount + student.sickCount + student.excusedCount, 0
          );
          
          setStatistics({
            totalClasses: response.data.totalClasses || 0,
            attendanceByStudent: studentStats,
            overallAttendanceRate: totalClasses > 0 ? (totalPresent / totalClasses) * 100 : 0
          });
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных о посещаемости:', error);
        setError('Не удалось загрузить данные о посещаемости');
      } finally {
        setIsLoading(false);
      }
    };

    if (selectedGroup && selectedStartDate && selectedEndDate) {
      fetchAttendanceData();
    }
  }, [selectedGroup, selectedSubject, selectedStartDate, selectedEndDate]);

  // Обработчики изменения выбранных значений
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const handleGroupChange = (event: SelectChangeEvent) => {
    setSelectedGroup(event.target.value);
  };

  const handleSubjectChange = (event: SelectChangeEvent) => {
    setSelectedSubject(event.target.value);
  };

  const handleStartDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedStartDate(event.target.value);
  };

  const handleEndDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedEndDate(event.target.value);
  };

  // Экспорт данных в CSV
  const handleExportData = () => {
    if (!attendanceRecords.length) return;
    
    let csvContent = "Дата,Студент,Предмет,Статус\n";
    
    attendanceRecords.forEach(record => {
      const status = record.status === 'П' ? 'Присутствовал' : 
                    record.status === 'Н' ? 'Отсутствовал' : 
                    record.status === 'Б' ? 'Болел' : 
                    record.status === 'У' ? 'Уважительная причина' : record.status;
                    
      csvContent += `${new Date(record.date).toLocaleDateString()},${record.studentName},${record.subjectName},${status}\n`;
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `attendance_${selectedGroup}_${selectedStartDate}_${selectedEndDate}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Преобразование статуса в читаемый текст и цвет
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'П':
        return { label: 'Присутствовал', color: 'success' };
      case 'Н':
        return { label: 'Отсутствовал', color: 'error' };
      case 'Б':
        return { label: 'Болел', color: 'warning' };
      case 'У':
        return { label: 'Уважительная причина', color: 'info' };
      default:
        return { label: status, color: 'default' };
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Администрирование посещаемости
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
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
                <MenuItem value="">
                  <em>Выберите группу</em>
                </MenuItem>
                {groups.map((group) => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
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
                <MenuItem value="">Все предметы</MenuItem>
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
              <InputLabel htmlFor="start-date-input" shrink>
                С даты
              </InputLabel>
              <Box sx={{ pt: 2 }}>
                <input
                  type="date"
                  id="start-date-input"
                  value={selectedStartDate}
                  onChange={handleStartDateChange}
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
            <FormControl fullWidth>
              <InputLabel htmlFor="end-date-input" shrink>
                По дату
              </InputLabel>
              <Box sx={{ pt: 2 }}>
                <input
                  type="date"
                  id="end-date-input"
                  value={selectedEndDate}
                  onChange={handleEndDateChange}
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
              disabled={!attendanceRecords.length || isLoading}
              onClick={handleExportData}
              startIcon={<Download />}
            >
              Экспорт
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {!selectedGroup ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography>Выберите группу для просмотра данных о посещаемости</Typography>
        </Paper>
      ) : isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Paper sx={{ mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange}
              indicatorColor="primary"
              textColor="primary"
              variant="fullWidth"
            >
              <Tab icon={<BarChart />} label="Статистика" />
              <Tab icon={<DateRange />} label="Журнал посещений" />
              <Tab icon={<People />} label="По студентам" />
            </Tabs>
            
            {/* Вкладка Статистика */}
            {activeTab === 0 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Общая статистика посещаемости
                </Typography>
                
                <Divider sx={{ mb: 2 }} />
                
                {statistics ? (
                  <>
                    <Grid container spacing={3} sx={{ mb: 3 }}>
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'primary.light', color: 'white' }}>
                          <Typography variant="h6">Общий процент посещаемости</Typography>
                          <Typography variant="h3" sx={{ my: 2 }}>
                            {statistics.overallAttendanceRate.toFixed(1)}%
                          </Typography>
                          <Typography variant="body2">
                            По всем занятиям за выбранный период
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'success.light', color: 'white' }}>
                          <Typography variant="h6">Всего занятий</Typography>
                          <Typography variant="h3" sx={{ my: 2 }}>
                            {statistics.totalClasses}
                          </Typography>
                          <Typography variant="body2">
                            Проведено за выбранный период
                          </Typography>
                        </Paper>
                      </Grid>
                      
                      <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'info.light', color: 'white' }}>
                          <Typography variant="h6">Студентов в группе</Typography>
                          <Typography variant="h3" sx={{ my: 2 }}>
                            {statistics.attendanceByStudent.length}
                          </Typography>
                          <Typography variant="body2">
                            {groups.find(g => g.id === selectedGroup)?.name || ''}
                          </Typography>
                        </Paper>
                      </Grid>
                    </Grid>
                    
                    {/* Рейтинг посещаемости */}
                    <Typography variant="h6" gutterBottom>
                      Рейтинг посещаемости студентов
                    </Typography>
                    
                    <TableContainer>
                      <Table>
                        <TableHead>
                          <TableRow>
                            <TableCell>Студент</TableCell>
                            <TableCell align="center">Посещаемость</TableCell>
                            <TableCell align="center">Присутствовал</TableCell>
                            <TableCell align="center">Отсутствовал</TableCell>
                            <TableCell align="center">Болел</TableCell>
                            <TableCell align="center">Уваж. причина</TableCell>
                            <TableCell align="right">Процент</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {statistics.attendanceByStudent
                            .sort((a, b) => b.attendanceRate - a.attendanceRate)
                            .map((student) => (
                              <TableRow key={student.studentId}>
                                <TableCell>{student.studentName}</TableCell>
                                <TableCell align="center">
                                  <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                                    <Box 
                                      sx={{ 
                                        width: '100%', 
                                        maxWidth: 100, 
                                        height: 8, 
                                        bgcolor: 'grey.200',
                                        borderRadius: 4,
                                        overflow: 'hidden'
                                      }}
                                    >
                                      <Box 
                                        sx={{ 
                                          width: `${student.attendanceRate}%`, 
                                          height: '100%', 
                                          bgcolor: student.attendanceRate >= 80 ? 'success.main' : 
                                                  student.attendanceRate >= 60 ? 'warning.main' : 'error.main' 
                                        }} 
                                      />
                                    </Box>
                                  </Box>
                                </TableCell>
                                <TableCell align="center">{student.presentCount}</TableCell>
                                <TableCell align="center">{student.absentCount}</TableCell>
                                <TableCell align="center">{student.sickCount}</TableCell>
                                <TableCell align="center">{student.excusedCount}</TableCell>
                                <TableCell align="right">
                                  <Typography
                                    variant="body2"
                                    color={
                                      student.attendanceRate >= 80 ? 'success.main' : 
                                      student.attendanceRate >= 60 ? 'warning.main' : 'error.main'
                                    }
                                    fontWeight="bold"
                                  >
                                    {student.attendanceRate.toFixed(1)}%
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  </>
                ) : (
                  <Typography variant="body1" sx={{ py: 2, textAlign: 'center' }}>
                    Нет данных о посещаемости за выбранный период
                  </Typography>
                )}
              </Box>
            )}
            
            {/* Вкладка Журнал посещений */}
            {activeTab === 1 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Журнал посещений
                  {selectedSubject && subjects.find(s => s.id === selectedSubject) && 
                    `: ${subjects.find(s => s.id === selectedSubject)?.name}`
                  }
                </Typography>
                
                <Divider sx={{ mb: 2 }} />
                
                {attendanceRecords.length > 0 ? (
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Дата</TableCell>
                          <TableCell>Студент</TableCell>
                          {!selectedSubject && <TableCell>Предмет</TableCell>}
                          <TableCell align="center">Статус</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {attendanceRecords
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map((record, index) => {
                            const statusInfo = getStatusInfo(record.status);
                            return (
                              <TableRow key={index}>
                                <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                                <TableCell>{record.studentName}</TableCell>
                                {!selectedSubject && <TableCell>{record.subjectName}</TableCell>}
                                <TableCell align="center">
                                  <Chip 
                                    label={statusInfo.label} 
                                    color={statusInfo.color as any}
                                    size="small"
                                  />
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Typography variant="body1" sx={{ py: 2, textAlign: 'center' }}>
                    Нет данных о посещаемости за выбранный период
                  </Typography>
                )}
              </Box>
            )}
            
            {/* Вкладка По студентам */}
            {activeTab === 2 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Посещаемость по студентам
                </Typography>
                
                <Divider sx={{ mb: 2 }} />
                
                {students.length > 0 ? (
                  <Grid container spacing={3}>
                    {students.map(student => {
                      const studentStats = statistics?.attendanceByStudent.find(
                        s => s.studentId === student.id
                      );
                      
                      if (!studentStats) return null;
                      
                      const studentRecords = attendanceRecords.filter(
                        r => r.studentId === student.id
                      );
                      
                      return (
                        <Grid item xs={12} md={6} key={student.id}>
                          <Paper sx={{ p: 2 }}>
                            <Typography variant="h6" gutterBottom>
                              {student.fullName}
                            </Typography>
                            
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                              <Box sx={{ flex: 1, mr: 2 }}>
                                <Box 
                                  sx={{ 
                                    width: '100%', 
                                    height: 8, 
                                    bgcolor: 'grey.200',
                                    borderRadius: 4,
                                    overflow: 'hidden'
                                  }}
                                >
                                  <Box 
                                    sx={{ 
                                      width: `${studentStats.attendanceRate}%`, 
                                      height: '100%', 
                                      bgcolor: studentStats.attendanceRate >= 80 ? 'success.main' : 
                                              studentStats.attendanceRate >= 60 ? 'warning.main' : 'error.main' 
                                    }} 
                                  />
                                </Box>
                              </Box>
                              <Typography
                                variant="body1"
                                color={
                                  studentStats.attendanceRate >= 80 ? 'success.main' : 
                                  studentStats.attendanceRate >= 60 ? 'warning.main' : 'error.main'
                                }
                                fontWeight="bold"
                              >
                                {studentStats.attendanceRate.toFixed(1)}%
                              </Typography>
                            </Box>
                            
                            <Grid container spacing={1} sx={{ mb: 2 }}>
                              <Grid item xs={3}>
                                <Typography variant="body2" color="text.secondary">
                                  Присутствовал
                                </Typography>
                                <Typography variant="h6" color="success.main">
                                  {studentStats.presentCount}
                                </Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="body2" color="text.secondary">
                                  Отсутствовал
                                </Typography>
                                <Typography variant="h6" color="error.main">
                                  {studentStats.absentCount}
                                </Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="body2" color="text.secondary">
                                  Болел
                                </Typography>
                                <Typography variant="h6" color="warning.main">
                                  {studentStats.sickCount}
                                </Typography>
                              </Grid>
                              <Grid item xs={3}>
                                <Typography variant="body2" color="text.secondary">
                                  Уваж. причина
                                </Typography>
                                <Typography variant="h6" color="info.main">
                                  {studentStats.excusedCount}
                                </Typography>
                              </Grid>
                            </Grid>
                            
                            {studentRecords.length > 0 && (
                              <Box sx={{ maxHeight: 150, overflow: 'auto' }}>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  Последние занятия:
                                </Typography>
                                {studentRecords
                                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                  .slice(0, 5)
                                  .map((record, index) => {
                                    const statusInfo = getStatusInfo(record.status);
                                    return (
                                      <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                        <Typography variant="body2" sx={{ flex: 1 }}>
                                          {new Date(record.date).toLocaleDateString()} - 
                                          {!selectedSubject && ` ${record.subjectName} -`}
                                        </Typography>
                                        <Chip 
                                          label={statusInfo.label} 
                                          color={statusInfo.color as any}
                                          size="small"
                                          sx={{ ml: 1 }}
                                        />
                                      </Box>
                                    );
                                  })}
                              </Box>
                            )}
                          </Paper>
                        </Grid>
                      );
                    })}
                  </Grid>
                ) : (
                  <Typography variant="body1" sx={{ py: 2, textAlign: 'center' }}>
                    Нет данных о студентах в выбранной группе
                  </Typography>
                )}
              </Box>
            )}
          </Paper>
        </>
      )}
    </Container>
  );
};

export default AdminAttendance; 