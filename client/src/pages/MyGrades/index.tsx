import React, { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Grid, 
  CircularProgress,
  Card,
  CardContent,
  Divider,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  LinearProgress,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Label,
  Sector,
  PieLabelRenderProps
} from 'recharts';
import { 
  School,
  TrendingUp,
  TrendingDown,
  Info,
  Error,
  Warning,
  CheckCircle,
  Assignment,
  Book,
  CreditScore,
  Quiz,
  ViewModule,
  Grade
} from '@mui/icons-material';
import { api } from '../../services/api';

interface PieChartDataItem {
  name: string;
  value: number;
  color: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const RISK_COLORS = {
  low: '#4caf50',    // Зеленый для низкого риска
  medium: '#ff9800', // Оранжевый для среднего риска
  high: '#f44336'    // Красный для высокого риска
};

// Вспомогательная функция определения цвета риска отчисления
const getRiskColor = (probability: number): string => {
  if (probability < 30) {
    return RISK_COLORS.low;
  } else if (probability < 60) {
    return RISK_COLORS.medium;
  } else {
    return RISK_COLORS.high;
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

// Вспомогательная функция для получения иконки типа оценки
const getGradeTypeIcon = (type: string) => {
  switch (type) {
    case 'exam':
      return <CreditScore />;
    case 'test':
      return <Quiz />;
    case 'homework':
      return <Assignment />;
    case 'project':
      return <ViewModule />;
    default:
      return <Grade />;
  }
};

const RADIAN = Math.PI / 180;

const renderCustomizedLabel = (props: PieLabelRenderProps) => {
  const { cx, cy, midAngle = 0, innerRadius = 0, outerRadius = 0, percent = 0, name = '' } = props;
  const numInnerRadius = typeof innerRadius === 'string' ? parseFloat(innerRadius) : innerRadius;
  const numOuterRadius = typeof outerRadius === 'string' ? parseFloat(outerRadius) : outerRadius;
  const radius = numInnerRadius + (numOuterRadius - numInnerRadius) * 0.5;
  const numCx = typeof cx === 'string' ? parseFloat(cx) : (cx || 0);
  const numCy = typeof cy === 'string' ? parseFloat(cy) : (cy || 0);
  const x = numCx + radius * Math.cos(-midAngle * RADIAN);
  const y = numCy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > numCx ? 'start' : 'end'} dominantBaseline="central">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const MyGrades: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [gradeAnalytics, setGradeAnalytics] = useState<any>(null);
  const [disciplineSummaries, setDisciplineSummaries] = useState<any[]>([]);
  const [recentGrades, setRecentGrades] = useState<any[]>([]);
  const [expulsionData, setExpulsionData] = useState<any>(null);

  useEffect(() => {
    const fetchGradeData = async () => {
      try {
        setLoading(true);
        
        // Загрузка аналитики оценок
        const analyticsResponse = await api.get('/grades/analytics');
        console.log('Полученная аналитика:', analyticsResponse.data);
        setGradeAnalytics(analyticsResponse.data);
        
        if (analyticsResponse.data) {
          setDisciplineSummaries(analyticsResponse.data.disciplines || []);
          setRecentGrades(analyticsResponse.data.recent_grades || []);
        }
        
        // Загрузка информации о вероятности отчисления
        const expulsionResponse = await api.get('/grades/expulsion-probability');
        console.log('Информация о вероятности отчисления:', expulsionResponse.data);
        setExpulsionData(expulsionResponse.data);
        
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
    if (!gradeAnalytics || !gradeAnalytics.overall_stats) return [];
    
    const { distribution } = gradeAnalytics.overall_stats;
    return Object.entries(distribution).map(([grade, count]: [string, any]) => ({
      name: `Оценка ${grade}`,
      value: count,
    }));
  };

  const prepareGradeTypeData = () => {
    if (!gradeAnalytics || !gradeAnalytics.overall_stats) return [];
    
    const { type_averages } = gradeAnalytics.overall_stats;
    if (!type_averages) return [];
    
    return Object.entries(type_averages).map(([type, average]: [string, any]) => {
      const typeNames: {[key: string]: string} = {
        'exam': 'Экзамен',
        'test': 'Тест',
        'homework': 'Д/з',
        'project': 'Проект',
        'activity': 'Активность',
        'quiz': 'Опрос',
        'lab': 'Лаб. работа',
      };
      
      return {
        name: typeNames[type] || type,
        average: average
      };
    });
  };

  // Форматирование данных для отображения оценок по дисциплинам
  const prepareDisciplinesData = () => {
    if (!disciplineSummaries) return [];
    
    return disciplineSummaries.map(discipline => ({
      name: discipline.discipline_name,
      average: discipline.average_grade
    }));
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 4 }}>
          <CircularProgress />
          <Typography sx={{ mt: 2 }}>Загрузка данных об успеваемости...</Typography>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  const distributionData = prepareDistributionData();
  const gradeTypeData = prepareGradeTypeData();
  const disciplinesData = prepareDisciplinesData();
  
  // Получаем информацию о вероятности отчисления
  const expulsionProbability = expulsionData?.probability || 0;
  const riskColor = getRiskColor(expulsionProbability);
  const riskFactors = expulsionData?.risk_factors || [];
  const trend = expulsionData?.trend || 'stable';

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Мои оценки
      </Typography>

      {/* Общая статистика */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Средний балл
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography variant="h3" component="div" color="primary">
                  {gradeAnalytics?.overall_stats?.average || 0}
                </Typography>
                <Typography variant="body1" color="textSecondary" sx={{ ml: 1 }}>
                  / 5.0
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Всего оценок: {gradeAnalytics?.overall_stats?.count || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Вероятность отчисления
              </Typography>
              <Box sx={{ position: 'relative', pt: 1 }}>
                <LinearProgress 
                  variant="determinate" 
                  value={expulsionProbability} 
                  sx={{ 
                    height: 10, 
                    borderRadius: 5,
                    backgroundColor: '#e0e0e0',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: riskColor
                    }
                  }} 
                />
                <Typography 
                  variant="h5" 
                  component="div" 
                  sx={{ 
                    mt: 1,
                    color: riskColor
                  }}
                >
                  {expulsionProbability}%
                </Typography>
              </Box>
              <Box sx={{ mt: 2 }}>
                {riskFactors.length > 0 ? (
                  <List dense>
                    {riskFactors.map((factor: string, index: number) => (
                      <ListItem key={index} disablePadding>
                        <ListItemIcon sx={{ minWidth: 30 }}>
                          <Warning fontSize="small" sx={{ color: riskColor }} />
                        </ListItemIcon>
                        <ListItemText 
                          primary={factor} 
                          primaryTypographyProps={{ variant: 'body2' }}
                        />
                      </ListItem>
                    ))}
                  </List>
                ) : (
                  <Typography variant="body2" color="textSecondary">
                    Факторы риска отсутствуют
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" component="div" gutterBottom>
                Тренд успеваемости
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 2 }}>
                {trend === 'improving' || trend === 'rapidly_improving' ? (
                  <TrendingUp fontSize="large" sx={{ color: '#4caf50', mr: 1 }} />
                ) : trend === 'declining' || trend === 'rapidly_declining' ? (
                  <TrendingDown fontSize="large" sx={{ color: '#f44336', mr: 1 }} />
                ) : (
                  <Info fontSize="large" sx={{ color: '#2196f3', mr: 1 }} />
                )}
                <Typography variant="h6" component="div">
                  {getTrendText(trend)}
                </Typography>
              </Box>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
                {trend === 'insufficient_data' ? 
                  'Недостаточно данных для анализа тренда' : 
                  'Анализ на основе изменения оценок за последний период'}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Графики */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Распределение оценок
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Средний балл по типам работ
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={gradeTypeData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis domain={[0, 5]} />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="average" name="Средний балл" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Оценки по дисциплинам */}
      <Paper sx={{ p: 2, mb: 4 }}>
        <Typography variant="h6" gutterBottom>
          Успеваемость по дисциплинам
        </Typography>
        <Box sx={{ height: 300, mb: 3 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={disciplinesData}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 100,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="name" 
                interval={0}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis domain={[0, 5]} />
              <RechartsTooltip />
              <Legend />
              <Bar dataKey="average" name="Средний балл" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </Box>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Дисциплина</TableCell>
                <TableCell align="center">Средний балл</TableCell>
                <TableCell align="center">Количество оценок</TableCell>
                <TableCell align="center">Распределение оценок</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {disciplineSummaries.map((discipline) => (
                <TableRow key={discipline.discipline_id} hover>
                  <TableCell component="th" scope="row">
                    {discipline.discipline_name}
                  </TableCell>
                  <TableCell align="center">
                    <Typography 
                      sx={{ 
                        fontWeight: 'bold',
                        color: discipline.average_grade >= 4 ? '#4caf50' : 
                               discipline.average_grade >= 3 ? '#ff9800' : '#f44336'
                      }}
                    >
                      {discipline.average_grade}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{discipline.grade_count}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
                      {Object.entries(discipline.grade_distribution).map(([grade, count]: [string, any]) => (
                        count > 0 && (
                          <Tooltip key={grade} title={`Оценок "${grade}": ${count}`}>
                            <Chip 
                              label={`${grade}: ${count}`} 
                              size="small"
                              sx={{ 
                                backgroundColor: 
                                  grade === '5' ? '#4caf50' : 
                                  grade === '4' ? '#8bc34a' : 
                                  grade === '3' ? '#ff9800' : 
                                  grade === '2' ? '#ff5722' : '#f44336',
                                color: 'white',
                                minWidth: 45
                              }}
                            />
                          </Tooltip>
                        )
                      ))}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Последние оценки */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Последние оценки
        </Typography>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Дата</TableCell>
                <TableCell>Дисциплина</TableCell>
                <TableCell>Тип работы</TableCell>
                <TableCell align="center">Оценка</TableCell>
                <TableCell>Описание</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {recentGrades.map((grade, index) => (
                <TableRow key={grade.id || index} hover>
                  <TableCell>{new Date(grade.date).toLocaleDateString()}</TableCell>
                  <TableCell>{grade.discipline_name}</TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {getGradeTypeIcon(grade.type)}
                      <Typography sx={{ ml: 1 }}>
                        {grade.type === 'exam' ? 'Экзамен' : 
                         grade.type === 'test' ? 'Тест' : 
                         grade.type === 'homework' ? 'Домашняя работа' : 
                         grade.type === 'project' ? 'Проект' : 
                         grade.type === 'activity' ? 'Активность' : grade.type}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={grade.value} 
                      sx={{ 
                        backgroundColor: 
                          grade.value === '5' ? '#4caf50' : 
                          grade.value === '4' ? '#8bc34a' : 
                          grade.value === '3' ? '#ff9800' : 
                          grade.value === '2' ? '#ff5722' : '#f44336',
                        color: 'white',
                        fontWeight: 'bold'
                      }}
                    />
                  </TableCell>
                  <TableCell>{grade.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        {recentGrades.length === 0 && (
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
            Нет данных о недавних оценках
          </Typography>
        )}
      </Paper>
    </Container>
  );
};

export default MyGrades; 