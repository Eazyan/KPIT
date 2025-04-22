import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import customTheme from './styles/theme';
import { AuthProvider } from './context/AuthContext';
import HomePage from './pages/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import TeacherAttendance from './pages/Attendance/TeacherAttendance';
import StudentQrScanner from './pages/Attendance/StudentQrScanner';
import StudentAttendance from './pages/Attendance/StudentAttendance';
import AdminAttendance from './pages/Attendance/AdminAttendance';
import MyGrades from './pages/MyGrades/index';
import GradeJournal from './pages/MyGrades/GradeJournal';
import Layout from './components/Layout/Layout';
import './App.css';

// Это тестовый комментарий для проверки горячей перезагрузки

function App() {
  // Тестовая переменная
  const testHotReload = "Обновление работает!";
  console.log(testHotReload);
  
  return (
    <ThemeProvider theme={customTheme}>
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
            <Route path="/grades/journal" element={<Layout><GradeJournal /></Layout>} />
            
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
