import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  Alert,
  CircularProgress
} from '@mui/material';
import { Close, QrCodeScanner } from '@mui/icons-material';
import { QrReader } from 'react-qr-reader';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { useContext } from 'react';
import { api } from '../../services/api';

interface QRData {
  groupId: string;
  subjectId: string;
  date: string;
  timestamp: number;
}

interface MarkAttendanceResponse {
  success: boolean;
  message: string;
}

const StudentQrScanner: React.FC = () => {
  const [scanning, setScanning] = useState<boolean>(false);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<QRData | null>(null);
  
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // Обработка результата сканирования
  const handleScan = async (result: any) => {
    if (result) {
      const text = result.text;
      console.log('Отсканирован QR-код:', text);
      if (text) {
        setScannedData(text);
        setScanning(false);
        
        try {
          console.log('Пытаемся распарсить JSON из QR-кода...');
          // Парсим данные QR-кода
          const qrData: QRData = JSON.parse(text);
          console.log('Успешно распарсили данные:', qrData);
          setScanResult(qrData);
          
          // Проверяем актуальность QR-кода (допустим, он действителен 5 минут)
          const currentTime = new Date().getTime();
          const qrTime = qrData.timestamp;
          const diffMinutes = Math.floor((currentTime - qrTime) / (60 * 1000));
          
          console.log(`QR-код создан ${diffMinutes} минут назад (${new Date(qrTime).toLocaleTimeString()})`);
          
          if (currentTime - qrTime > 5 * 60 * 1000) {
            console.log('QR-код устарел!');
            setError(`QR-код устарел. Создан ${diffMinutes} минут назад. Попросите преподавателя обновить QR-код.`);
            return;
          }
          
          await markAttendance(qrData);
        } catch (err) {
          console.error('Ошибка при обработке QR-кода:', err);
          console.error('Содержимое QR-кода:', text);
          setError('Некорректный QR-код. Пожалуйста, попробуйте снова.');
        }
      }
    }
  };

  // Отправка запроса на отметку посещаемости
  const markAttendance = async (qrData: QRData) => {
    if (!user) {
      setError('Необходимо авторизоваться');
      return;
    }
    
    console.log('Начинаем отправку данных о посещаемости');
    console.log('QR данные:', qrData);
    console.log('Пользователь:', user);
    
    setLoading(true);
    setError(null);
    setSuccess(null);
    
    try {
      // Подготовка данных запроса
      const requestData = {
        studentId: user._id,
        groupId: qrData.groupId,
        subjectId: qrData.subjectId,
        date: qrData.date,
        timestamp: qrData.timestamp
      };
      
      console.log('Отправляем данные:', requestData);
      
      const response = await api.post<MarkAttendanceResponse>('/attendance/student/mark-qr', requestData);
      
      console.log('Получен ответ:', response.data);
      
      if (response.data.success) {
        setSuccess(response.data.message || 'Посещаемость успешно отмечена!');
      } else {
        setError(response.data.message || 'Не удалось отметить посещаемость');
      }
    } catch (err: any) {
      console.error('Детали ошибки:', err);
      if (err.response) {
        console.error('Ответ сервера:', err.response.data);
        console.error('Статус ответа:', err.response.status);
        console.error('Заголовки ответа:', err.response.headers);
      } else if (err.request) {
        console.error('Запрос был отправлен, но нет ответа:', err.request);
      } else {
        console.error('Ошибка при настройке запроса:', err.message);
      }
      setError(err.response?.data?.detail || 'Произошла ошибка при отметке посещаемости');
      console.error('Ошибка при отметке посещаемости:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleError = (err: any) => {
    console.error('Ошибка сканирования QR-кода:', err);
    setError('Ошибка при сканировании QR-кода. Убедитесь, что у вас есть доступ к камере.');
  };

  const handleStartScanning = () => {
    setScanning(true);
    setError(null);
    setSuccess(null);
    setScannedData(null);
    setScanResult(null);
  };

  const handleClose = () => {
    setScanning(false);
  };

  // Функция для тестирования отладки QR-кода
  const debugLastScannedData = async () => {
    if (!scannedData || !user) {
      setError('Нет данных для отладки. Сначала отсканируйте QR-код.');
      return;
    }
    
    setLoading(true);
    try {
      let testData;
      try {
        // Пробуем распарсить QR-код как JSON
        testData = JSON.parse(scannedData);
      } catch (e) {
        setError('Ошибка при парсинге данных QR-кода. Убедитесь, что это JSON.');
        setLoading(false);
        return;
      }
      
      // Отправляем данные на тестовый эндпоинт
      const response = await api.post('/attendance/debug-qr', testData);
      console.log('Результат отладки QR-кода:', response.data);
      
      if (response.data.success) {
        setSuccess('Тестовый запрос успешно выполнен. Проверьте консоль браузера.');
      } else {
        setError(`Ошибка при тестировании: ${response.data.message}`);
      }
    } catch (err: any) {
      console.error('Ошибка при тестировании QR-кода:', err);
      setError(err.response?.data?.detail || 'Ошибка при отладке QR-кода');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Отметка посещаемости
      </Typography>
      
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="body1" paragraph>
          Для отметки посещаемости отсканируйте QR-код, предоставленный преподавателем.
        </Typography>
        
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 2, gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<QrCodeScanner />}
            onClick={handleStartScanning}
            disabled={loading}
          >
            Сканировать QR-код
          </Button>
          
          {scannedData && (
            <Button
              variant="outlined"
              color="secondary"
              onClick={debugLastScannedData}
              disabled={loading}
            >
              Отладка QR-кода
            </Button>
          )}
        </Box>
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        )}
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {success}
          </Alert>
        )}
        
        {scanResult && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="h6" gutterBottom>
              Информация о посещаемости:
            </Typography>
            <Typography variant="body2">
              <strong>Дата:</strong> {new Date(scanResult.date).toLocaleDateString()}
            </Typography>
            <Typography variant="body2">
              <strong>Статус:</strong> {success ? 'Посещение отмечено' : 'Ошибка при отметке посещения'}
            </Typography>
          </Box>
        )}
      </Paper>
      
      {/* Диалог для сканирования QR-кода */}
      <Dialog
        open={scanning}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent sx={{ p: 1 }}>
          <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
            <IconButton onClick={handleClose}>
              <Close />
            </IconButton>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center',
            p: 2
          }}>
            <Typography variant="h6" gutterBottom align="center">
              Отсканируйте QR-код
            </Typography>
            
            <Box sx={{ width: '100%', mt: 2 }}>
              {scanning && (
                <QrReader
                  onResult={handleScan}
                  constraints={{ facingMode: 'environment' }}
                  containerStyle={{ width: '100%' }}
                  videoStyle={{ width: '100%' }}
                  scanDelay={500}
                />
              )}
            </Box>
            
            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
              Направьте камеру на QR-код преподавателя
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Отмена</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default StudentQrScanner; 