import React, { useState, useEffect, useMemo } from 'react';
import './styles.css';
import { 
  Typography, 
  CircularProgress,
  Alert,
  Box,
  Grid,
  IconButton,
  Container,
  LinearProgress
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  School,
  Grade,
  Timeline,
  AccessTime,
  Forum,
  Add,
  ArrowForwardIos,
  CalendarViewMonth,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Импорт утилит и компонентов
import { 
  calculateGradeTrend, 
  calculateGoodGradePercentage, 
  getGradeColor,
  getRiskCategory,
  extractAverageGrade
} from '../../utils/gradeUtils';
import { GradesService } from '../../services/gradesService';
import GradeIndicator from '../../components/grades/GradeIndicator';
import TrendIndicator from '../../components/grades/TrendIndicator';
import ProgressBar from '../../components/grades/ProgressBar';
import RiskIndicator from '../../components/grades/RiskIndicator';
import StatsCard from '../../components/grades/StatsCard';

// Константы
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

interface PieChartDataItem {
  name: string;
  value: number;
  color: string;
}

const MyGrades: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeAnalytics, setGradeAnalytics] = useState<any>(null);
  const [disciplineSummaries, setDisciplineSummaries] = useState<any[]>([]);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [expulsionData, setExpulsionData] = useState<{ probability: number }>({ probability: 0 });
  const { user } = useAuth();

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Получение данных с помощью сервиса
        const analytics = await GradesService.getAnalytics();
        const studentData = await GradesService.getStudentGrades();
        const expulsionInfo = await GradesService.getExpulsionProbability();
        
        console.log('Данные аналитики:', analytics);
        console.log('Данные студента:', studentData);
        console.log('Данные о риске отчисления:', expulsionInfo);
        
        // Объединение данных из разных источников
        const combinedData = {
          ...analytics,
          stats: { ...analytics.stats, ...studentData.stats }
        };
        
        setGradeAnalytics(combinedData);
        setDisciplineSummaries(analytics.disciplines);
        setRecentGrades(studentData.grades.length > 0 ? studentData.grades : analytics.recentGrades);
        setExpulsionData(expulsionInfo);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Вычисляемые значения с мемоизацией для оптимизации
  const averageGrade = useMemo(() => {
    return gradeAnalytics ? extractAverageGrade(gradeAnalytics.stats, "4.20") : "0.00";
  }, [gradeAnalytics]);
  
  // Определение тренда на основе имеющихся данных
  const gradeTrend = useMemo(() => {
    if (!recentGrades || recentGrades.length === 0) return 'stable';
    
    const trendFromApi = gradeAnalytics?.trend || gradeAnalytics?.grade_trend;
    if (trendFromApi) return trendFromApi;
    
    return calculateGradeTrend(recentGrades);
  }, [recentGrades, gradeAnalytics]);
  
  // Процент хороших оценок
  const goodGradePercentage = useMemo(() => {
    if (!gradeAnalytics || !gradeAnalytics.stats || !gradeAnalytics.stats.distribution) {
      return 0;
    }
    
    return calculateGoodGradePercentage(gradeAnalytics.stats.distribution);
  }, [gradeAnalytics]);
  
  // Данные для графиков
  const distributionData = useMemo(() => {
    if (!gradeAnalytics || !gradeAnalytics.stats || !gradeAnalytics.stats.distribution) {
      return [];
    }
    
    return Object.entries(gradeAnalytics.stats.distribution).map(([grade, count]: [string, any]) => ({
      name: `Оценка ${grade}`,
      value: count,
    }));
  }, [gradeAnalytics]);
  
  const disciplinesData = useMemo(() => {
    if (!disciplineSummaries) return [];
    
    return disciplineSummaries.map(discipline => ({
      name: discipline.discipline_name,
      average: discipline.average_grade
    }));
  }, [disciplineSummaries]);
  
  // Данные о посещаемости (пример данных)
  const attendanceData = [
    { name: 'Пн', value1: 100, value2: 150 },
    { name: 'Вт', value1: 200, value2: 130 },
    { name: 'Ср', value1: 150, value2: 180 },
    { name: 'Чт', value1: 230, value2: 200 },
    { name: 'Пт', value1: 180, value2: 150 },
    { name: 'Сб', value1: 120, value2: 100 },
  ];
  
  // Пример значения посещаемости
  const attendancePercentage = "87";

  // Отображение загрузки
  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4 }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Загрузка данных об успеваемости...</Typography>
      </Box>
    );
  }

  // Отображение ошибки
  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ my: 3 }}>
      {/* Информационные карточки */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <StatsCard
            title="Средний балл"
            value={averageGrade}
            icon={<Timeline />}
            iconColor={getGradeColor(parseFloat(averageGrade))}
            subtitle="из 5.0"
            progress={parseFloat(averageGrade) * 20} // От 0 до 100% (5.0 это 100%)
            progressMax={100}
            progressColor={getGradeColor(parseFloat(averageGrade))}
            trend={<TrendIndicator trend={gradeTrend} showDescription={true} />}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <StatsCard
            title="Посещаемость и активность"
            value={attendancePercentage + '%'}
            icon={<AccessTime />}
            iconColor="#3773c6"
            progress={parseInt(attendancePercentage)}
            progressMax={100}
          >
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2">Активность на занятиях</Typography>
                  <Typography variant="body2" fontWeight="medium">72%</Typography>
                </Box>
                <ProgressBar 
                  value={72} 
                  color="#8884d8"
                />
                <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, display: 'block' }}>
                  Хорошая активность на занятиях
                </Typography>
              </Grid>
            </Grid>
          </StatsCard>
        </Grid>

        <Grid item xs={12} md={4}>
          <StatsCard
            title="Риск отчисления"
            value=""
            icon={<School />}
            iconColor={getRiskCategory(expulsionData.probability).color}
          >
            <RiskIndicator 
              probability={expulsionData.probability} 
              showPercentage={true}
              showScale={true}
            />
          </StatsCard>
        </Grid>
      </Grid>

      {/* График посещаемости и статистики */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={6}>
          <Box sx={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.1)',
            p: 3 
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Посещаемость по дням</Typography>
              <IconButton size="small">
                <Add />
              </IconButton>
            </Box>
            
            <Box sx={{ height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <RechartsTooltip />
                  <Bar dataKey="value1" name="Посещено" fill="#8884d8" radius={[5, 5, 0, 0]} />
                  <Bar dataKey="value2" name="Всего занятий" fill="#82ca9d" radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Box sx={{ 
            backgroundColor: 'white', 
            borderRadius: '8px', 
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            border: '1px solid rgba(0,0,0,0.1)',
            p: 3 
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">Распределение оценок</Typography>
            </Box>
            
            <Box sx={{ height: 250, display: 'flex', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label={(entry: {name: string, value: number}) => entry.name}
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              borderRadius: '8px', 
              background: 'linear-gradient(90deg, rgba(20, 77, 160, 0.8) 0%, rgba(25, 118, 210, 0.8) 100%)',
              color: 'white' 
            }}>
              <Typography variant="subtitle1">Академические показатели</Typography>
              
              <Box 
                component={Link} 
                to="/grades/journal"
                state={{ fromDashboard: true }}
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mt: 1,
                  p: 2,
                  borderRadius: 2,
                  textDecoration: 'none',
                  color: 'white',
                  background: 'rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 4px 8px rgba(20, 77, 160, 0.15)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 6px 12px rgba(20, 77, 160, 0.25)',
                    transform: 'translateY(-2px)',
                    background: 'rgba(255, 255, 255, 0.2)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <CalendarViewMonth fontSize="small" sx={{ mr: 1 }} />
                  <Typography fontWeight="medium">Журнал оценок</Typography>
                </Box>
                <ArrowForwardIos fontSize="small" />
              </Box>
            </Box>
          </Box>
        </Grid>
      </Grid>
      
      {/* Блок с последними оценками */}
      <Box sx={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid rgba(0,0,0,0.1)',
        p: 3,
        mt: 3
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Последние оценки</Typography>
        </Box>
        
        {recentGrades && recentGrades.length > 0 ? (
          recentGrades.slice(0, 3).map((grade, index) => (
            <Box 
              key={index} 
              sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                p: 1.5, 
                borderBottom: index < recentGrades.slice(0, 3).length - 1 ? '1px solid #eee' : 'none',
                '&:hover': { backgroundColor: 'rgba(0,0,0,0.02)' },
                borderRadius: '4px'
              }}
            >
              <Box sx={{ width: '40%' }}>
                <Typography variant="body1" fontWeight="medium">{grade.discipline_name}</Typography>
                <Typography variant="caption" color="textSecondary">{grade.type}</Typography>
              </Box>
              
              <Box sx={{ width: '25%', textAlign: 'center' }}>
                <Typography variant="body2">
                  {new Date(grade.date).toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric'
                  })}
                </Typography>
              </Box>
              
              <Box sx={{ width: '15%', display: 'flex', justifyContent: 'flex-end' }}>
                <GradeIndicator value={grade.value} />
              </Box>
            </Box>
          ))
        ) : (
          <Typography variant="body2" sx={{ textAlign: 'center', py: 3 }}>
            Нет недавних оценок
          </Typography>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Box 
            component={Link} 
            to="/grades/journal"
            sx={{ 
              display: 'inline-block',
              py: 1,
              px: 3,
              borderRadius: '20px',
              textDecoration: 'none',
              color: 'white',
              background: 'linear-gradient(90deg, #144da0 0%, #1976d2 100%)',
              boxShadow: '0 2px 4px rgba(20, 77, 160, 0.2)',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: '0 4px 8px rgba(20, 77, 160, 0.3)',
                transform: 'translateY(-1px)'
              }
            }}
          >
            <Typography fontWeight="medium">Показать все оценки</Typography>
          </Box>
        </Box>
      </Box>
      
      {/* Успеваемость по дисциплинам */}
      <Box sx={{ 
        backgroundColor: 'white', 
        borderRadius: '8px', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        border: '1px solid rgba(0,0,0,0.1)',
        p: 3,
        mt: 3
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">Успеваемость по дисциплинам</Typography>
        </Box>
        
        {disciplineSummaries && disciplineSummaries.length > 0 ? (
          <Grid container spacing={2}>
            {disciplineSummaries.slice(0, 4).map((discipline, index) => {
              const avgGrade = typeof discipline.average_grade === 'string' ? 
                parseFloat(discipline.average_grade) : discipline.average_grade;
              
              return (
                <Grid item xs={12} sm={6} key={index}>
                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="body1">{discipline.discipline_name}</Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography variant="body1" fontWeight="bold" sx={{ mr: 1 }}>
                          {avgGrade.toFixed(2)}
                        </Typography>
                        <GradeIndicator value={avgGrade} size="small" />
                      </Box>
                    </Box>
                    <ProgressBar 
                      value={avgGrade} 
                      max={5} 
                      color={getGradeColor(avgGrade)}
                    />
                  </Box>
                </Grid>
              );
            })}
          </Grid>
        ) : (
          <Typography variant="body2" sx={{ textAlign: 'center', py: 3 }}>
            Нет данных по дисциплинам
          </Typography>
        )}
      </Box>
    </Container>
  );
};

export default MyGrades; 