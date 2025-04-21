import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { createTheme } from '@mui/material/styles';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import TeacherAttendance from './pages/Attendance/TeacherAttendance';
import StudentQrScanner from './pages/Attendance/StudentQrScanner';
import StudentAttendance from './pages/Attendance/StudentAttendance';
import AdminAttendance from './pages/Attendance/AdminAttendance';
import MyGrades from './pages/MyGrades/index';
import Layout from './components/Layout/Layout';
import './App.css';

// Создаем тему для материал дизайна
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#f50057',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

// Это тестовый комментарий для проверки горячей перезагрузки

function App() {
  // Тестовая переменная
  const testHotReload = "Обновление работает!";
  console.log(testHotReload);
  
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            {/* Публичные маршруты */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Защищенные маршруты (с Layout) */}
            <Route path="/" element={<Layout><HomePage /></Layout>} />
            
            {/* Маршруты для страниц посещаемости */}
            <Route path="/attendance/teacher" element={<Layout><TeacherAttendance /></Layout>} />
            <Route path="/attendance/scan" element={<Layout><StudentQrScanner /></Layout>} />
            <Route path="/attendance/my" element={<Layout><StudentAttendance /></Layout>} />
            <Route path="/attendance/admin" element={<Layout><AdminAttendance /></Layout>} />
            
            {/* Маршрут для страницы оценок */}
            <Route path="/grades" element={<Layout><MyGrades /></Layout>} />
            
            {/* Устаревшие маршруты для обратной совместимости */}
            <Route path="/attendance" element={<Layout><TeacherAttendance /></Layout>} />
            <Route path="/scan-qr" element={<Layout><StudentQrScanner /></Layout>} />
            
            {/* Маршрут по умолчанию при несуществующем URL */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
