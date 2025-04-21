import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  Button, 
  Alert,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme
} from '@mui/material';
import { QrCodeScanner, CheckCircle, Error } from '@mui/icons-material';
import { Html5Qrcode } from 'html5-qrcode';
import { Layout } from '../components/Layout';
import { api } from '../services/api';

// Статусы сканирования
enum ScanStatus {
  IDLE = 'idle',
  SCANNING = 'scanning',
  SUCCESS = 'success',
  ERROR = 'error'
}

const ScanQRPage: React.FC = () => {
  const theme = useTheme();
  const [scanStatus, setScanStatus] = useState<ScanStatus>(ScanStatus.IDLE);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  
  const qrScanner = useRef<Html5Qrcode | null>(null);
  const scannerRef = useRef<HTMLDivElement>(null);
  
  // Очистка сканера при размонтировании компонента
  useEffect(() => {
    return () => {
      if (qrScanner.current && qrScanner.current.isScanning) {
        qrScanner.current.stop();
      }
    };
  }, []);
  
  const startScanning = () => {
    if (!scannerRef.current) return;
    
    setScanStatus(ScanStatus.SCANNING);
    setErrorMessage(null);
    setScanResult(null);
    
    const scannerId = 'qr-reader';
    
    // Создаем контейнер для сканера, если его еще нет
    if (!document.getElementById(scannerId)) {
      const scannerContainer = document.createElement('div');
      scannerContainer.id = scannerId;
      scannerRef.current.appendChild(scannerContainer);
    }
    
    // Инициализируем сканер, если он еще не создан
    if (!qrScanner.current) {
      qrScanner.current = new Html5Qrcode(scannerId);
    }
    
    const qrCodeSuccessCallback = async (decodedText: string) => {
      // Останавливаем сканирование после успешного сканирования
      await qrScanner.current?.stop();
      
      setScanResult(decodedText);
      setScanStatus(ScanStatus.SUCCESS);
      
      // Отправляем данные на сервер
      sendQRData(decodedText);
    };
    
    const qrCodeErrorCallback = (error: any) => {
      // Ошибки при сканировании не обрабатываем, они происходят постоянно
      // пока код не будет найден
    };
    
    const config = { fps: 10, qrbox: { width: 250, height: 250 } };
    
    qrScanner.current
      .start(
        { facingMode: "environment" }, // используем заднюю камеру
        config,
        qrCodeSuccessCallback,
        qrCodeErrorCallback
      )
      .catch((err) => {
        setScanStatus(ScanStatus.ERROR);
        setErrorMessage(`Не удалось запустить сканер: ${err}`);
      });
  };
  
  const stopScanning = async () => {
    if (qrScanner.current && qrScanner.current.isScanning) {
      await qrScanner.current.stop();
    }
    setScanStatus(ScanStatus.IDLE);
  };
  
  const sendQRData = async (qrData: string) => {
    try {
      setLoading(true);
      
      const response = await api.post('/attendance/mark-by-qr', {
        data: qrData
      });
      
      setSuccessData(response.data);
      setShowSuccessDialog(true);
    } catch (error: any) {
      setScanStatus(ScanStatus.ERROR);
      setErrorMessage(
        error.response?.data?.detail || 
        'Произошла ошибка при обработке QR-кода.'
      );
    } finally {
      setLoading(false);
    }
  };
  
  const handleCloseSuccessDialog = () => {
    setShowSuccessDialog(false);
    setScanStatus(ScanStatus.IDLE);
  };
  
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          Сканирование QR-кода посещаемости
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Отсканируйте QR-код, показанный преподавателем, чтобы отметить свое присутствие на занятии
        </Typography>
      </Box>
      
      <Paper 
        elevation={0}
        sx={{ 
          p: 3, 
          mb: 4,
          textAlign: 'center',
          borderRadius: 4,
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <Box 
          ref={scannerRef} 
          sx={{ 
            mb: 3,
            overflow: 'hidden',
            borderRadius: 2,
            width: '100%',
            maxWidth: '400px',
            mx: 'auto',
            height: scanStatus === ScanStatus.SCANNING ? '400px' : 'auto'
          }}
        />
        
        {scanStatus === ScanStatus.IDLE && (
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<QrCodeScanner />}
            onClick={startScanning}
            sx={{ borderRadius: 2, py: 1.5, px: 4 }}
          >
            Начать сканирование
          </Button>
        )}
        
        {scanStatus === ScanStatus.SCANNING && (
          <Button
            variant="outlined"
            color="primary"
            onClick={stopScanning}
            sx={{ borderRadius: 2, mt: 2 }}
          >
            Отменить сканирование
          </Button>
        )}
        
        {scanStatus === ScanStatus.ERROR && errorMessage && (
          <Box mt={3}>
            <Alert severity="error" sx={{ textAlign: 'left', mb: 2 }}>
              {errorMessage}
            </Alert>
            <Button
              variant="contained"
              color="primary"
              onClick={startScanning}
              sx={{ borderRadius: 2 }}
            >
              Попробовать еще раз
            </Button>
          </Box>
        )}
        
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
            <CircularProgress />
          </Box>
        )}
      </Paper>
      
      <Paper 
        elevation={0}
        sx={{ 
          p: 3,
          borderRadius: 4,
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}
      >
        <Typography variant="h6" fontWeight={600} gutterBottom>
          Инструкция по сканированию
        </Typography>
        <Typography variant="body2" paragraph>
          1. Нажмите кнопку "Начать сканирование" и разрешите доступ к камере
        </Typography>
        <Typography variant="body2" paragraph>
          2. Наведите камеру на QR-код, показанный преподавателем
        </Typography>
        <Typography variant="body2" paragraph>
          3. Держите камеру ровно и подождите, пока QR-код будет распознан
        </Typography>
        <Typography variant="body2">
          4. После успешного сканирования вы увидите подтверждение вашего присутствия
        </Typography>
      </Paper>
      
      {/* Диалог успешной отметки */}
      <Dialog
        open={showSuccessDialog}
        onClose={handleCloseSuccessDialog}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: 'center', pb: 0 }}>
          Посещение отмечено
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pt: 2 }}>
          <CheckCircle 
            color="success" 
            sx={{ fontSize: 60, mb: 2 }} 
          />
          <Typography variant="subtitle1" fontWeight={600}>
            {successData?.discipline}
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Дата: {successData?.date}
          </Typography>
          <Typography variant="body2">
            Ваше присутствие успешно отмечено на занятии
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 3 }}>
          <Button 
            onClick={handleCloseSuccessDialog} 
            variant="contained" 
            color="primary"
            sx={{ borderRadius: 2 }}
          >
            Закрыть
          </Button>
        </DialogActions>
      </Dialog>
    </Layout>
  );
};

export default ScanQRPage; 