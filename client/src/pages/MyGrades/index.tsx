import React, { useState, useEffect } from 'react';
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
  TrendingUp,
  Add,
  ArrowUpward,
  ArrowForwardIos,
  TrendingDown,
  TrendingFlat,
  ReportProblem,
  CheckCircle,
  Shield,
  Timeline,
  AccessTime,
  Forum
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

interface PieChartDataItem {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const RISK_COLORS = {
  none: '#4caf50',     // Зеленый для отсутствия риска
  low: '#8bc34a',      // Светло-зеленый для низкого риска
  medium: '#ffb74d',   // Теплый оранжевый для среднего риска
  high: '#ff9800',     // Оранжевый для высокого риска
  critical: '#f44336'  // Красный для критического риска
};

// Вспомогательная функция определения категории и цвета риска отчисления
const getRiskCategory = (probability: number): { category: string, color: string } => {
  if (probability <= 10) {
    return { category: 'Нет риска', color: RISK_COLORS.none };
  } else if (probability <= 25) {
    return { category: 'Низкий риск', color: RISK_COLORS.low };
  } else if (probability <= 50) {
    return { category: 'Средний риск', color: RISK_COLORS.medium };
  } else if (probability <= 75) {
    return { category: 'Высокий риск', color: RISK_COLORS.high };
  } else {
    return { category: 'Критический риск', color: RISK_COLORS.critical };
  }
};

// Вспомогательная функция вычисления тренда на основе оценок
const calculateGradeTrend = (grades: GradeItem[]): string => {
  if (!grades || grades.length < 3) {
    return 'insufficient_data';
  }
  
  // Сортируем оценки по дате (от старых к новым)
  const sortedGrades = [...grades].sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  
  // Берем числовые значения оценок
  const numericGrades = sortedGrades.map(grade => 
    typeof grade.value === 'string' ? parseFloat(grade.value) : grade.value
  ).filter(value => !isNaN(value));
  
  if (numericGrades.length < 3) {
    return 'insufficient_data';
  }
  
  // Простая линейная регрессия
  // Разделим массив на две части для определения тренда
  const halfLength = Math.floor(numericGrades.length / 2);
  const firstHalfAvg = numericGrades.slice(0, halfLength).reduce((sum, grade) => sum + grade, 0) / halfLength;
  const secondHalfAvg = numericGrades.slice(halfLength).reduce((sum, grade) => sum + grade, 0) / (numericGrades.length - halfLength);
  
  const difference = secondHalfAvg - firstHalfAvg;
  
  // Определяем тренд на основе разницы
  if (difference > 0.5) {
    return 'rapidly_improving';
  } else if (difference > 0.1) {
    return 'improving';
  } else if (difference < -0.5) {
    return 'rapidly_declining';
  } else if (difference < -0.1) {
    return 'declining';
  } else {
    return 'stable';
  }
};

// Вспомогательная функция получения текста тренда оценок
const getTrendText = (trend: string): string => {
  switch (trend) {
    case 'improving':
      return 'Улучшается';
    case 'rapidly_improving':
      return 'Быстро улучшается';
    case 'declining':
      return 'Ухудшается';
    case 'rapidly_declining':
      return 'Быстро ухудшается';
    case 'stable':
      return 'Стабильный';
    default:
      return 'Недостаточно данных';
  }
};

// Вспомогательная функция получения иконки тренда и её цвета
const getTrendIcon = (trend: string): { icon: React.ReactNode, color: string } => {
  switch (trend) {
    case 'improving':
      return { icon: <TrendingUp fontSize="large" />, color: '#4caf50' };
    case 'rapidly_improving':
      return { icon: <TrendingUp fontSize="large" />, color: '#4caf50' };
    case 'declining':
      return { icon: <TrendingDown fontSize="large" />, color: '#f44336' };
    case 'rapidly_declining':
      return { icon: <TrendingDown fontSize="large" />, color: '#f44336' };
    case 'stable':
      return { icon: <TrendingFlat fontSize="large" />, color: '#ffb74d' };
    default:
      return { icon: <TrendingFlat fontSize="large" />, color: '#9e9e9e' };
  }
};

// Вспомогательная функция получения иконки для уровня риска
const getRiskIcon = (riskCategory: string): React.ReactNode => {
  switch (riskCategory) {
    case 'Нет риска':
      return <CheckCircle style={{ marginRight: '8px', color: RISK_COLORS.none }} />;
    case 'Низкий риск':
      return <Shield style={{ marginRight: '8px', color: RISK_COLORS.low }} />;
    case 'Средний риск':
    case 'Высокий риск':
    case 'Критический риск':
      return <ReportProblem style={{ marginRight: '8px' }} />;
    default:
      return null;
  }
};

interface DisciplineSummary {
  discipline_id: string;
  discipline_name: string;
  average_grade: number | string;
  grades_count?: number;
}

interface GradeItem {
  id: string;
  value: string;
  discipline_name: string;
  date: string;
  type: string;
}

// Вспомогательная функция для получения цвета среднего балла
const getAverageGradeColor = (average: number): string => {
  if (average >= 4.5) return '#4caf50'; // Отлично
  if (average >= 4.0) return '#8bc34a'; // Хорошо
  if (average >= 3.0) return '#ffb74d'; // Удовлетворительно
  if (average >= 2.0) return '#ff9800'; // Плохо
  return '#f44336'; // Очень плохо
};

const MyGrades: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeAnalytics, setGradeAnalytics] = useState<any>(null);
  const [disciplineSummaries, setDisciplineSummaries] = useState<DisciplineSummary[]>([]);
  const [recentGrades, setRecentGrades] = useState<GradeItem[]>([]);
  const [expulsionData, setExpulsionData] = useState<any>(null);
  const { user } = useAuth(); // Получаем текущего пользователя

  useEffect(() => {
    const fetchGradeData = async () => {
      try {
        setLoading(true);
        
        // Загрузка аналитики оценок
        const analyticsResponse = await api.get('/grades/analytics');
        console.log('Полученная аналитика:', analyticsResponse.data);
        
        // Сохраняем данные для дальнейшего использования
        setGradeAnalytics(analyticsResponse.data);
        
        // Получаем данные также из эндпоинта student, который теперь содержит и оценки, и статистику
        try {
          const studentGradesResponse = await api.get('/grades/student');
          console.log('Данные из /grades/student:', studentGradesResponse.data);
          
          // Если студент эндпоинт вернул статистику, обновляем данные
          if (studentGradesResponse.data && studentGradesResponse.data.stats) {
            console.log('Найдена статистика в /grades/student:', studentGradesResponse.data.stats);
            // Обновляем аналитику, так как статистика из /grades/student более актуальна
            setGradeAnalytics({
              ...analyticsResponse.data,
              overall_stats: studentGradesResponse.data.stats.overall_stats || analyticsResponse.data.overall_stats,
              disciplines: studentGradesResponse.data.stats.disciplines || analyticsResponse.data.disciplines
            });
          }
        } catch (studentGradesError) {
          console.error('Ошибка при получении данных из /grades/student:', studentGradesError);
        }
        
        // Проверка структуры с созданием примера, если данных нет
        const exampleData = {
          "overall_stats": {
            "average_grade": 4.2,
            "distribution": {
              "5": 15,
              "4": 23,
              "3": 8,
              "2": 2,
              "1": 0
            }
          },
          "grades_by_discipline": [
            {
              "discipline_id": "60a6e8eab84a1c001e8f0a1b",
              "discipline_name": "Математика",
              "average_grade": 4.5,
              "grades_count": 12
            },
            {
              "discipline_id": "60a6e8eab84a1c001e8f0a1c",
              "discipline_name": "Физика",
              "average_grade": 3.8,
              "grades_count": 10
            }
          ],
          "recent_grades": [
            {
              "id": "61a6e8eab84a1c001e8f0a1d",
              "value": "5",
              "discipline_name": "Математика",
              "date": "2023-05-15T00:00:00.000Z",
              "type": "Экзамен"
            }
          ]
        };
        
        console.log('Пример ожидаемой структуры данных:', exampleData);
        console.log('Структура полученной аналитики:', JSON.stringify(analyticsResponse.data, null, 2));
        
        // Извлечение данных из ответа сервера
        let disciplines: DisciplineSummary[] = [];
        let grades: GradeItem[] = [];
        
        if (analyticsResponse.data) {
          // Проверим наличие дисциплин в разных возможных местах структуры
          if (Array.isArray(analyticsResponse.data.grades_by_discipline)) {
            disciplines = analyticsResponse.data.grades_by_discipline;
            console.log('Найдены дисциплины в grades_by_discipline:', disciplines);
          } else if (Array.isArray(analyticsResponse.data.disciplines)) {
            disciplines = analyticsResponse.data.disciplines;
            console.log('Найдены дисциплины в disciplines:', disciplines);
          } else if (typeof analyticsResponse.data === 'object' && analyticsResponse.data !== null) {
            // Попробуем найти массив объектов, подходящий под формат дисциплин
            const possibleDisciplines = Object.values(analyticsResponse.data)
              .filter(val => Array.isArray(val))
              .find((val) => {
                // Проверяем, что это массив с нужными свойствами
                if (!Array.isArray(val) || val.length === 0) return false;
                
                const firstItem = val[0];
                return typeof firstItem === 'object' && 
                      firstItem !== null && 
                      'discipline_name' in firstItem;
              }) as DisciplineSummary[] | undefined;
              
            if (possibleDisciplines) {
              disciplines = possibleDisciplines;
              console.log('Найдены дисциплины в неизвестном поле:', disciplines);
            } else {
              console.log('Не удалось найти дисциплины в ответе API');
              // Используем пример данных для отображения
              disciplines = exampleData.grades_by_discipline;
            }
          }
          
          // Проверка наличия последних оценок
          if (Array.isArray(analyticsResponse.data.recent_grades)) {
            grades = analyticsResponse.data.recent_grades as GradeItem[];
            console.log('Найдены оценки в recent_grades:', grades);
          } else if (Array.isArray(analyticsResponse.data.grades)) {
            grades = analyticsResponse.data.grades as GradeItem[];
            console.log('Найдены оценки в grades:', grades);
          } else {
            console.log('Не удалось найти оценки в ответе API, получаем их напрямую');
            // Получаем оценки отдельным запросом
            try {
              const gradesResponse = await api.get('/grades/student/all');
              grades = gradesResponse.data;
              console.log('Получены оценки через API:', grades);
            } catch (gradeError) {
              console.error('Ошибка при получении оценок:', gradeError);
              // Используем пример данных для отображения
              grades = exampleData.recent_grades as GradeItem[];
            }
          }
        }
        
        // Установка найденных данных
        setDisciplineSummaries(disciplines);
        setRecentGrades(grades);
        
        // Загрузка информации о вероятности отчисления
        const expulsionResponse = await api.get('/grades/expulsion-probability');
        console.log('Информация о вероятности отчисления:', expulsionResponse.data);
        setExpulsionData(expulsionResponse.data || { probability: 25 });
        
      } catch (error) {
        console.error('Ошибка при загрузке данных об оценках:', error);
        setError('Не удалось загрузить данные об оценках. Попробуйте обновить страницу.');
      } finally {
        setLoading(false);
      }
    };

    fetchGradeData();
  }, []);

  // Подготовка данных для графиков
  const prepareDistributionData = () => {
    if (!gradeAnalytics) return [];
    
    // Проверяем разные пути к данным о распределении оценок
    const distribution = gradeAnalytics.overall_stats?.distribution || 
                        gradeAnalytics.grades_distribution || 
                        gradeAnalytics.distribution || {};
    
    return Object.entries(distribution).map(([grade, count]: [string, any]) => ({
      name: `Оценка ${grade}`,
      value: count,
    }));
  };

  // Форматирование данных для отображения оценок по дисциплинам
  const prepareDisciplinesData = () => {
    if (!disciplineSummaries) return [];
    
    return disciplineSummaries.map(discipline => ({
      name: discipline.discipline_name,
      average: discipline.average_grade
    }));
  };

  // Подготовка данных для графика посещаемости
  const prepareAttendanceData = () => {
    // Пример данных для графика посещаемости
    return [
      { name: 'Пн', value1: 100, value2: 150 },
      { name: 'Вт', value1: 200, value2: 130 },
      { name: 'Ср', value1: 150, value2: 180 },
      { name: 'Чт', value1: 230, value2: 200 },
      { name: 'Пт', value1: 180, value2: 150 },
      { name: 'Сб', value1: 120, value2: 100 },
    ];
  };

  if (loading) {
    return (
      <div className="dashboard-container grades-dashboard">
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Загрузка данных об успеваемости...</Typography>
        </Box>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container grades-dashboard">
        <Alert severity="error">{error}</Alert>
      </div>
    );
  }

  const disciplinesData = prepareDisciplinesData();
  const attendanceData = prepareAttendanceData();
  const distributionData = prepareDistributionData();
  
  // Получаем информацию о вероятности отчисления
  const expulsionProbability = expulsionData?.probability || 0;
  const { category: riskCategory, color: riskColor } = getRiskCategory(expulsionProbability);
  
  // Вычисление среднего балла из имеющихся данных
  let overallAverage = "0.00";
  
  if (gradeAnalytics) {
    console.log('Попытка получить средний балл из данных:', gradeAnalytics);
    
    // Проверяем все возможные пути к значению среднего балла
    // Новый путь из /grades/student
    if (gradeAnalytics.overall_stats && typeof gradeAnalytics.overall_stats.average === 'number') {
      overallAverage = gradeAnalytics.overall_stats.average.toFixed(2);
      console.log('Найден overall_stats.average из /grades/student (number):', gradeAnalytics.overall_stats.average);
    }
    else if (gradeAnalytics.overall_stats && typeof gradeAnalytics.overall_stats.average === 'string' && 
             !isNaN(parseFloat(gradeAnalytics.overall_stats.average))) {
      overallAverage = parseFloat(gradeAnalytics.overall_stats.average).toFixed(2);
      console.log('Найден overall_stats.average из /grades/student (string):', gradeAnalytics.overall_stats.average);
    }
    // Оставшиеся пути
    else if (typeof gradeAnalytics.overall_average === 'number') {
      overallAverage = gradeAnalytics.overall_average.toFixed(2);
      console.log('Найден overall_average (number):', gradeAnalytics.overall_average);
    } 
    else if (typeof gradeAnalytics.overall_average === 'string' && !isNaN(parseFloat(gradeAnalytics.overall_average))) {
      overallAverage = parseFloat(gradeAnalytics.overall_average).toFixed(2);
      console.log('Найден overall_average (string):', gradeAnalytics.overall_average);
    }
    else if (gradeAnalytics.overall_stats && typeof gradeAnalytics.overall_stats.average_grade === 'number') {
      overallAverage = gradeAnalytics.overall_stats.average_grade.toFixed(2);
      console.log('Найден overall_stats.average_grade (number):', gradeAnalytics.overall_stats.average_grade);
    }
    else if (gradeAnalytics.overall_stats && typeof gradeAnalytics.overall_stats.average_grade === 'string' && 
             !isNaN(parseFloat(gradeAnalytics.overall_stats.average_grade))) {
      overallAverage = parseFloat(gradeAnalytics.overall_stats.average_grade).toFixed(2);
      console.log('Найден overall_stats.average_grade (string):', gradeAnalytics.overall_stats.average_grade);
    }
    // Прямой доступ к полю average_grade, если оно есть
    else if (typeof gradeAnalytics.average_grade === 'number') {
      overallAverage = gradeAnalytics.average_grade.toFixed(2);
      console.log('Найден average_grade (number):', gradeAnalytics.average_grade);
    }
    else if (typeof gradeAnalytics.average_grade === 'string' && !isNaN(parseFloat(gradeAnalytics.average_grade))) {
      overallAverage = parseFloat(gradeAnalytics.average_grade).toFixed(2);
      console.log('Найден average_grade (string):', gradeAnalytics.average_grade);
    }
    // Попробуем рассчитать среднее из дисциплин
    else if (disciplineSummaries && disciplineSummaries.length > 0) {
      const validGrades = disciplineSummaries
        .map(discipline => {
          const grade = typeof discipline.average_grade === 'string' ? 
            parseFloat(discipline.average_grade) : discipline.average_grade;
          return isNaN(grade) ? 0 : grade;
        })
        .filter(grade => grade > 0);
        
      if (validGrades.length > 0) {
        const sum = validGrades.reduce((acc, grade) => acc + grade, 0);
        overallAverage = (sum / validGrades.length).toFixed(2);
        console.log('Рассчитан средний балл из дисциплин:', overallAverage);
      } else {
        console.log('Не удалось рассчитать средний балл из дисциплин - нет валидных оценок');
        overallAverage = "4.20"; // Используем дефолтное значение для примера
      }
    } else {
      console.log('Не удалось найти информацию о среднем балле, используем дефолтное значение');
      overallAverage = "4.20"; // Используем дефолтное значение для примера
    }
  } else {
    console.log('Объект gradeAnalytics отсутствует, используем дефолтное значение среднего балла');
    overallAverage = "4.20"; // Используем дефолтное значение для примера
  }
  
  console.log('Итоговый средний балл для отображения:', overallAverage);
  
  // Если данных о посещаемости нет, используем примерные данные
  const attendancePercentage = "87"; // Пример значения

  // Определяем тренд на основе имеющихся данных, если он не предоставлен API
  let trendValue = gradeAnalytics?.trend || gradeAnalytics?.grade_trend || '';
  if (!trendValue && recentGrades && recentGrades.length > 0) {
    console.log('Расчет тренда на основе имеющихся оценок');
    trendValue = calculateGradeTrend(recentGrades);
    console.log('Рассчитанное значение тренда:', trendValue);
  } else if (!trendValue) {
    console.log('Недостаточно данных для расчета тренда');
    // Если данных нет, используем пример для демонстрации
    trendValue = 'improving';
  }

  return (
    <Container maxWidth="lg" className="grades-dashboard">
      {/* Информационные карточки */}
      <Grid container spacing={2} sx={{ mt: 2 }}>
        <Grid item xs={12} md={4}>
          <div 
            className="stats-card grade-card" 
            style={{ 
              backgroundColor: 'white',
              border: `2px solid ${getAverageGradeColor(parseFloat(overallAverage))}`,
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}
          >
            <div className="grade-content">
              <div className="card-title">
                <Timeline style={{ 
                  marginRight: '8px', 
                  color: getAverageGradeColor(parseFloat(overallAverage))
                }} />
                <Typography variant="subtitle1">Средний балл</Typography>
              </div>
              <Typography 
                variant="h4" 
                style={{ 
                  fontWeight: 'bold', 
                  margin: '10px 0',
                  color: '#333'
                }}
              >
                {overallAverage}
                <Typography variant="caption" style={{ marginLeft: '8px', fontWeight: 'normal' }}>
                  из 5.0
                </Typography>
              </Typography>
              <div className="trend-indicator">
                <div className="trend-line-container" style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '8px', height: '8px' }}>
                  <div className="trend-line" 
                    style={{ 
                      backgroundColor: getAverageGradeColor(parseFloat(overallAverage)),
                      width: `${(parseFloat(overallAverage) / 5) * 100}%`,
                      height: '8px',
                      borderRadius: '8px'
                    }}
                  ></div>
                </div>
                <div className="grade-scale" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '2px' }}>
                  <Typography variant="caption" color="textSecondary">0</Typography>
                  <Typography variant="caption" color="textSecondary">5.0</Typography>
                </div>
              </div>
              
              <div className="trend-value" style={{ display: 'flex', alignItems: 'center', marginTop: '10px', padding: '4px 8px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.05)' }}>
                <div style={{ color: getTrendIcon(trendValue).color }}>
                  {getTrendIcon(trendValue).icon}
                </div>
                <div style={{ marginLeft: '5px' }}>
                  <Typography 
                    variant="body2" 
                    style={{ 
                      fontWeight: 'bold',
                      color: '#333'
                    }}
                  >
                    Тренд: {getTrendText(trendValue)}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    {trendValue.includes('improving') ? 'Успеваемость растет' : 
                     trendValue.includes('declining') ? 'Успеваемость падает' : 
                     'Успеваемость стабильна'}
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        </Grid>

        <Grid item xs={12} md={4}>
          <div 
            className="stats-card attendance-card" 
            style={{ 
              backgroundColor: 'white',
              border: '2px solid #3773c6',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}
          >
            <div className="attendance-content">
              <div className="card-column">
                <div className="card-title">
                  <AccessTime style={{ 
                    marginRight: '8px', 
                    color: '#3773c6'
                  }} />
                  <Typography variant="subtitle1">Посещаемость</Typography>
                </div>
                <Typography 
                  variant="h4" 
                  style={{ 
                    fontWeight: 'bold', 
                    margin: '10px 0',
                    color: '#333'
                  }}
                >
                  {attendancePercentage}%
                </Typography>
                <div className="trend-indicator">
                  <div className="trend-line-container" style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '8px', height: '8px' }}>
                    <div className="trend-line" 
                      style={{ 
                        backgroundColor: '#3773c6',
                        width: `${attendancePercentage}%`,
                        height: '8px',
                        borderRadius: '8px'
                      }}
                    ></div>
                  </div>
                  <Typography variant="caption" color="textSecondary" style={{ marginTop: '2px', display: 'block' }}>
                    {parseInt(attendancePercentage) > 80 ? 'Отличная посещаемость' : 
                     parseInt(attendancePercentage) > 60 ? 'Хорошая посещаемость' : 
                     'Требует улучшения'}
                  </Typography>
                </div>
              </div>
              
              <div className="card-column">
                <div className="card-title">
                  <Forum style={{ 
                    marginRight: '8px', 
                    color: '#8884d8'
                  }} />
                  <Typography variant="subtitle1">Активность</Typography>
                </div>
                <Typography 
                  variant="h4" 
                  style={{ 
                    fontWeight: 'bold', 
                    margin: '10px 0',
                    color: '#333'
                  }}
                >
                  72%
                </Typography>
                <div className="trend-indicator">
                  <div className="trend-line-container" style={{ backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: '8px', height: '8px' }}>
                    <div className="trend-line" 
                      style={{ 
                        backgroundColor: '#8884d8',
                        width: '72%',
                        height: '8px',
                        borderRadius: '8px'
                      }}
                    ></div>
                  </div>
                  <Typography variant="caption" color="textSecondary" style={{ marginTop: '2px', display: 'block' }}>
                    {'Хорошая активность на занятиях'}
                  </Typography>
                </div>
              </div>
            </div>
          </div>
        </Grid>

        <Grid item xs={12} md={4}>
          <div 
            className="grades-stats-card risk-card" 
            style={{ 
              backgroundColor: 'white',
              border: `2px solid ${riskColor}`,
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}
          >
            <div className="risk-content">
              <div className="risk-title">
                {riskCategory === 'Нет риска' ? (
                  <CheckCircle style={{ 
                    marginRight: '8px', 
                    color: RISK_COLORS.none
                  }} />
                ) : riskCategory === 'Низкий риск' ? (
                  <Shield style={{ 
                    marginRight: '8px', 
                    color: RISK_COLORS.low
                  }} />
                ) : (
                  <ReportProblem style={{ 
                    marginRight: '8px',
                    color: riskColor
                  }} />
                )}
                <Typography variant="subtitle1">Риск отчисления</Typography>
              </div>
              
              <div style={{ 
                marginTop: '10px', 
                padding: '8px', 
                borderRadius: '4px', 
                backgroundColor: 'rgba(0,0,0,0.05)',
                display: 'flex',
                alignItems: 'center'
              }}>
                <Typography 
                  variant="h4" 
                  style={{ 
                    fontWeight: 'bold',
                    color: '#333',
                    marginRight: '10px'
                  }}
                >
                  {riskCategory}
                </Typography>
                <Typography variant="body2" style={{ color: '#666' }}>
                  {riskCategory === 'Нет риска' ? '(0-10%)' :
                   riskCategory === 'Низкий риск' ? '(11-25%)' :
                   riskCategory === 'Средний риск' ? '(26-50%)' :
                   riskCategory === 'Высокий риск' ? '(51-75%)' :
                   '(76-100%)'}
                </Typography>
              </div>
              
              <div style={{ marginTop: '15px' }}>
                <div className="risk-level-indicator" style={{ display: 'flex', width: '100%', height: '24px', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ flex: 1, height: '100%', backgroundColor: RISK_COLORS.none, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="caption" style={{ color: 'white', fontWeight: 'bold', fontSize: '10px' }}>НЕТ</Typography>
                  </div>
                  <div style={{ flex: 1, height: '100%', backgroundColor: RISK_COLORS.low, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="caption" style={{ color: 'white', fontWeight: 'bold', fontSize: '10px' }}>НИЗКИЙ</Typography>
                  </div>
                  <div style={{ flex: 1, height: '100%', backgroundColor: RISK_COLORS.medium, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="caption" style={{ color: 'white', fontWeight: 'bold', fontSize: '10px' }}>СРЕДНИЙ</Typography>
                  </div>
                  <div style={{ flex: 1, height: '100%', backgroundColor: RISK_COLORS.high, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="caption" style={{ color: 'white', fontWeight: 'bold', fontSize: '10px' }}>ВЫСОКИЙ</Typography>
                  </div>
                  <div style={{ flex: 1, height: '100%', backgroundColor: RISK_COLORS.critical, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="caption" style={{ color: 'white', fontWeight: 'bold', fontSize: '10px' }}>КРИТИЧ</Typography>
                  </div>
                </div>
                <div style={{ 
                  position: 'relative', 
                  height: '16px', 
                  marginTop: '4px' 
                }}>
                  <div style={{
                    position: 'absolute',
                    left: `${expulsionProbability}%`,
                    transform: 'translateX(-50%)',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: riskColor,
                    border: '2px solid white',
                    boxShadow: '0 0 4px rgba(0,0,0,0.3)'
                  }}></div>
                </div>
                <Typography variant="caption" color="textSecondary" style={{ marginTop: '8px', display: 'block' }}>
                  {riskCategory === 'Нет риска' ? 'Риск отчисления минимален. Продолжайте в том же духе!' : 
                   riskCategory === 'Низкий риск' ? 'Низкий риск отчисления. Обратите внимание на проблемные дисциплины.' :
                   riskCategory === 'Средний риск' ? 'Средний риск отчисления. Рекомендуется улучшить посещаемость и успеваемость.' :
                   riskCategory === 'Высокий риск' ? 'Высокий риск отчисления. Срочно обратитесь к куратору!' :
                   'Критический риск отчисления. Требуется немедленная консультация с деканатом!'}
                </Typography>
              </div>
            </div>
          </div>
        </Grid>
      </Grid>

      {/* График посещаемости и статистики */}
      <Grid container spacing={3} style={{ marginTop: '10px' }}>
        <Grid item xs={12} md={6}>
          <div className="white-card">
            <div className="card-header">
              <Typography variant="h6">Посещаемость по дням</Typography>
              <IconButton size="small">
                <Add />
              </IconButton>
            </div>
            
            {/* График посещаемости */}
            <div className="attendance-chart">
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
            </div>
          </div>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <div className="white-card">
            <div className="card-header">
              <Typography variant="h6">Распределение оценок</Typography>
            </div>
            
            {/* Диаграмма распределения оценок */}
            <div style={{ height: 250, display: 'flex', justifyContent: 'center' }}>
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
            </div>
            
            {/* Блок для дополнительных действий */}
            <div className="blue-card" style={{ marginTop: '20px' }}>
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
                  background: 'linear-gradient(90deg, #144da0 0%, #1976d2 100%)',
                  boxShadow: '0 4px 8px rgba(20, 77, 160, 0.15)',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 6px 12px rgba(20, 77, 160, 0.25)',
                    transform: 'translateY(-2px)'
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Timeline fontSize="small" sx={{ mr: 1 }} />
                  <Typography fontWeight="medium">Подробная статистика</Typography>
                </Box>
                <ArrowForwardIos fontSize="small" />
              </Box>
            </div>
          </div>
        </Grid>
      </Grid>
      
      {/* Нижняя часть с последними оценками */}
      <Grid container spacing={3} style={{ marginTop: '10px' }}>
        <Grid item xs={12}>
          <div className="white-card">
            <div className="card-header">
              <Typography variant="h6">Последние оценки</Typography>
            </div>
            
            {recentGrades && recentGrades.length > 0 ? (
              <Box>
                {recentGrades.slice(0, 3).map((grade, index) => (
                  <Box key={index} sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderBottom: index < recentGrades.length - 1 ? '1px solid #eee' : 'none' }}>
                    <div style={{ flex: 2 }}>
                      <Typography variant="body2">{grade.discipline_name}</Typography>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <Typography variant="body2">{new Date(grade.date).toLocaleDateString()}</Typography>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div className="attendance-row">
                        <div className="attendance-status" style={{ backgroundColor: Number(grade.value) >= 4 ? '#4CAF50' : '#FF9800' }}></div>
                        <Typography variant="body2">{grade.type}</Typography>
                      </div>
                    </div>
                    
                    <div style={{ flex: 1, textAlign: 'right' }}>
                      <Typography variant="subtitle1" style={{ fontWeight: 'bold', color: '#144da0' }}>{grade.value}</Typography>
                    </div>
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ textAlign: 'center', py: 3 }}>
                Нет недавних оценок
            </Typography>
            )}
          </div>
        </Grid>
      </Grid>

      {/* Дисциплины и успеваемость */}
      <Grid container spacing={3} style={{ marginTop: '10px' }}>
        <Grid item xs={12}>
          <div className="white-card">
            <div className="card-header">
              <Typography variant="h6">Успеваемость по дисциплинам</Typography>
            </div>
            
            {disciplineSummaries && disciplineSummaries.length > 0 ? (
              <Box>
                {disciplineSummaries.slice(0, 4).map((discipline: DisciplineSummary, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body1">{discipline.discipline_name}</Typography>
                      <Typography variant="body1" style={{ fontWeight: 'bold' }}>
                        {parseFloat(typeof discipline.average_grade === 'string' ? 
                          discipline.average_grade : discipline.average_grade.toString()).toFixed(2)} из 5.0
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={parseFloat(typeof discipline.average_grade === 'string' ? 
                        discipline.average_grade : discipline.average_grade.toString()) / 5 * 100} 
                      sx={{ 
                        height: 8, 
                        borderRadius: 4,
                        backgroundColor: 'rgba(0,0,0,0.1)',
                        '& .MuiLinearProgress-bar': {
                          backgroundColor: parseFloat(typeof discipline.average_grade === 'string' ? 
                            discipline.average_grade : discipline.average_grade.toString()) >= 4 ? '#4CAF50' : 
                            parseFloat(typeof discipline.average_grade === 'string' ? 
                            discipline.average_grade : discipline.average_grade.toString()) >= 3 ? '#FF9800' : '#F44336'
                        }
                      }} 
                    />
                  </Box>
                ))}
              </Box>
            ) : (
              <Typography variant="body2" sx={{ textAlign: 'center', py: 3 }}>
                Нет данных по дисциплинам
          </Typography>
        )}
          </div>
        </Grid>
      </Grid>
    </Container>
  );
};

export default MyGrades; 