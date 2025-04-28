import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { AuthProvider } from './context/AuthContext';
import './App.css';

// Lazy loading для ленивой загрузки компонентов
const LoginPage = React.lazy(() => import('./pages/Auth/LoginPage'));
const RegisterPage = React.lazy(() => import('./pages/Auth/RegisterPage'));
const HomePage = React.lazy(() => import('./pages/HomePage'));
const TeacherAttendance = React.lazy(() => import('./pages/Attendance/TeacherAttendance'));
const StudentQrScanner = React.lazy(() => import('./pages/Attendance/StudentQrScanner'));
const StudentAttendance = React.lazy(() => import('./pages/Attendance/StudentAttendance'));
const AdminAttendance = React.lazy(() => import('./pages/Attendance/AdminAttendance'));
const MyGrades = React.lazy(() => import('./pages/MyGrades'));
const TeacherGrades = React.lazy(() => import('./pages/MyGrades/TeacherGrades'));
const StudentGrades = React.lazy(() => import('./pages/MyGrades/StudentGrades'));
const AdminGrades = React.lazy(() => import('./pages/MyGrades/AdminGrades'));
const GradeJournal = React.lazy(() => import('./pages/MyGrades/GradeJournal'));
const Layout = React.lazy(() => import('./components/Layout/Layout'));

// Компонент для отображения во время загрузки
const LoadingFallback = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
    Загрузка...
  </div>
);

function App() {
  return (
    <ThemeProvider>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <React.Suspense fallback={<LoadingFallback />}>
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
              
              {/* Маршруты для страниц оценок */}
              <Route path="/grades" element={<Layout><MyGrades /></Layout>} />
              <Route path="/grades/teacher" element={<Layout><TeacherGrades /></Layout>} />
              <Route path="/grades/student" element={<Layout><StudentGrades /></Layout>} />
              <Route path="/grades/admin" element={<Layout><AdminGrades /></Layout>} />
              <Route path="/grades/journal" element={<Layout><GradeJournal /></Layout>} />
              
              {/* Устаревшие маршруты для обратной совместимости */}
              <Route path="/attendance" element={<Layout><TeacherAttendance /></Layout>} />
              <Route path="/scan-qr" element={<Layout><StudentQrScanner /></Layout>} />
              
              {/* Маршрут по умолчанию при несуществующем URL */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </React.Suspense>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App; 