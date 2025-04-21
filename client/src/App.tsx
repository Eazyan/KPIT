import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            
            {/* Маршруты для страниц посещаемости */}
            <Route path="/attendance/teacher" element={<TeacherAttendance />} />
            <Route path="/attendance/scan" element={<StudentQrScanner />} />
            <Route path="/attendance/my" element={<StudentAttendance />} />
            <Route path="/attendance/admin" element={<AdminAttendance />} />
            
            {/* Устаревшие маршруты для обратной совместимости */}
            <Route path="/attendance" element={<TeacherAttendance />} />
            <Route path="/scan-qr" element={<StudentQrScanner />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
