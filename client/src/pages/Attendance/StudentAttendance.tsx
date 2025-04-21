import React, { useState, useEffect, useContext } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Grid,
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  Button,
  Divider
} from '@mui/material';
import { CalendarMonth, QrCodeScanner } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { AuthContext } from '../../context/AuthContext';

interface AttendanceRecord {
  date: string;
  subject: string;
  status: string;
  teacher: string;
}

interface AttendanceStats {
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  sickCount: number;
  excusedCount: number;
  attendanceRate: number;
}

const StudentAttendance: React.FC = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [stats, setStats] = useState<AttendanceStats | null>(null);

  useEffect(() => {
    const fetchAttendanceData = async () => {
      if (!user) return;

      try {
        setIsLoading(true);
        // Получаем данные о посещаемости студента
        const response = await api.get('/api/attendance/student');
        
        if (response.data) {
          setRecords(response.data.records || []);
          
          // Рассчитываем статистику
          const presentCount = records.filter(r => r.status === 'present').length;
          const absentCount = records.filter(r => r.status === 'absent').length;
          const sickCount = records.filter(r => r.status === 'sick').length;
          const excusedCount = records.filter(r => r.status === 'excused').length;
          const totalClasses = presentCount + absentCount + sickCount + excusedCount;
          
          setStats({
            totalClasses,
            presentCount,
            absentCount,
            sickCount,
            excusedCount,
            attendanceRate: totalClasses > 0 ? (presentCount / totalClasses) * 100 : 0
          });
        }
      } catch (error) {
        console.error('Ошибка при загрузке данных о посещаемости:', error);
        setError('Не удалось загрузить данные о посещаемости');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttendanceData();
  }, [user]);

  // Функция для отображения статуса в читаемом виде и с цветом
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'present':
        return { label: 'Присутствовал', color: 'success' };
      case 'absent':
        return { label: 'Отсутствовал', color: 'error' };
      case 'sick':
        return { label: 'Болел', color: 'warning' };
      case 'excused':
        return { label: 'Уважительная причина', color: 'info' };
      default:
        return { label: status, color: 'default' };
    }
  };

  const handleScanQR = () => {
    navigate('/attendance/scan');
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Моя посещаемость
      </Typography>
      
      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={9}>
              <Paper sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <CalendarMonth sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6">Статистика посещаемости</Typography>
                </Box>
                
                <Divider sx={{ mb: 2 }} />
                
                {stats ? (
                  <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'primary.light', color: 'white', borderRadius: 1 }}>
                        <Typography variant="h3" fontWeight={600}>
                          {stats.attendanceRate.toFixed(1)}%
                        </Typography>
                        <Typography variant="body2">
                          Общая посещаемость
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={6} md={2}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'success.light', color: 'white', borderRadius: 1 }}>
                        <Typography variant="h4" fontWeight={600}>
                          {stats.presentCount}
                        </Typography>
                        <Typography variant="body2">
                          Присутствий
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={6} md={2}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'error.light', color: 'white', borderRadius: 1 }}>
                        <Typography variant="h4" fontWeight={600}>
                          {stats.absentCount}
                        </Typography>
                        <Typography variant="body2">
                          Пропусков
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={6} md={2}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'warning.light', color: 'white', borderRadius: 1 }}>
                        <Typography variant="h4" fontWeight={600}>
                          {stats.sickCount}
                        </Typography>
                        <Typography variant="body2">
                          Болезнь
                        </Typography>
                      </Box>
                    </Grid>
                    
                    <Grid item xs={6} md={2}>
                      <Box sx={{ textAlign: 'center', p: 2, bgcolor: 'info.light', color: 'white', borderRadius: 1 }}>
                        <Typography variant="h4" fontWeight={600}>
                          {stats.excusedCount}
                        </Typography>
                        <Typography variant="body2">
                          Уваж. причины
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                ) : (
                  <Typography variant="body1" color="text.secondary" align="center">
                    Нет данных о посещаемости
                  </Typography>
                )}
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={3}>
              <Card sx={{ height: '100%' }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'center', alignItems: 'center' }}>
                  <QrCodeScanner sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    Отметить посещение
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2, textAlign: 'center' }}>
                    Отсканируйте QR-код преподавателя для отметки посещения
                  </Typography>
                  <Button 
                    variant="contained" 
                    startIcon={<QrCodeScanner />}
                    onClick={handleScanQR}
                    fullWidth
                  >
                    Сканировать QR-код
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
          
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Журнал посещений
            </Typography>
            
            <Divider sx={{ mb: 2 }} />
            
            {records.length > 0 ? (
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Дата</TableCell>
                      <TableCell>Предмет</TableCell>
                      <TableCell>Преподаватель</TableCell>
                      <TableCell align="center">Статус</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {records
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((record, index) => {
                        const statusInfo = getStatusInfo(record.status);
                        return (
                          <TableRow key={index}>
                            <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                            <TableCell>{record.subject}</TableCell>
                            <TableCell>{record.teacher}</TableCell>
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
              <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 2 }}>
                Нет данных о посещениях
              </Typography>
            )}
          </Paper>
        </>
      )}
    </Container>
  );
};

export default StudentAttendance;  