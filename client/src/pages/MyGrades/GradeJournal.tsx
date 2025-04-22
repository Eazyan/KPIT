import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Container, 
  Paper, 
  Box, 
  Grid, 
  Select, 
  MenuItem, 
  FormControl, 
  InputLabel, 
  TextField, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Alert,
  CircularProgress,
  Button,
  SelectChangeEvent,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
/* Временно закомментируем проблемные импорты для решения ошибок TypeScript 
import { 
  DatePicker, 
  LocalizationProvider 
} from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
*/
import ruLocale from 'date-fns/locale/ru';
import { 
  FilterAlt,
  Refresh, 
  CalendarViewMonth,
  TableRows,
  Download,
  BarChart,
  Assessment
} from '@mui/icons-material';
import { format, parseISO, isValid } from 'date-fns';
import { api } from '../../services/api';
import { useLocation } from 'react-router-dom';

// Интерфейсы для типизации данных
interface Discipline {
  id: string;
  discipline_id: string;
  discipline_name: string;
  semester?: number;
  average_grade?: number;
}

interface GradeItem {
  id: string;
  value: string;
  discipline_id: string;
  discipline_name: string;
  date: string;
  type: string;
  description?: string;
}

interface GradeJournalFilters {
  discipline: string;
  startDate: Date | null;
  endDate: Date | null;
  gradeType: string;
}

// Вспомогательная функция для определения цвета оценки
const getGradeColor = (grade: string | number): string => {
  const numGrade = typeof grade === 'string' ? parseFloat(grade) : grade;
  
  if (numGrade >= 4.5) return '#4caf50';
  if (numGrade >= 4.0) return '#8bc34a';
  if (numGrade >= 3.0) return '#ffb74d';
  if (numGrade >= 2.0) return '#ff9800';
  return '#f44336';
};

// Основной компонент страницы журнала оценок
const GradeJournal: React.FC = () => {
  const location = useLocation();
  const fromDashboard = location.state?.fromDashboard;
  
  // Состояния
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [disciplines, setDisciplines] = useState<Discipline[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);
  const [filteredGrades, setFilteredGrades] = useState<GradeItem[]>([]);
  const [filters, setFilters] = useState<GradeJournalFilters>({
    discipline: '',
    startDate: null,
    endDate: null,
    gradeType: ''
  });
  const [gradeTypes, setGradeTypes] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // Загрузка данных при монтировании компонента
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Загрузка дисциплин и аналитики
        const analyticsResponse = await api.get('/grades/analytics');
        
        // Извлекаем список дисциплин из ответа API
        let disciplinesList: Discipline[] = [];
        const data = analyticsResponse.data;
        
        if (data.grades_by_discipline) {
          disciplinesList = data.grades_by_discipline;
        } else if (data.disciplines) {
          disciplinesList = data.disciplines;
        } else {
          // Ищем массив с полем discipline_name
          const possibleDisciplines = Object.values(data)
            .filter(val => Array.isArray(val))
            .find((val: any) => {
              if (!Array.isArray(val) || val.length === 0) return false;
              return typeof val[0] === 'object' && val[0] !== null && 'discipline_name' in val[0];
            });
              
          if (possibleDisciplines) {
            disciplinesList = possibleDisciplines as Discipline[];
          }
        }
        
        setDisciplines(disciplinesList);
        
        // Загрузка всех оценок студента
        const gradesResponse = await api.get('/grades/student');
        const gradesData = gradesResponse.data || [];
        
        setGrades(gradesData);
        setFilteredGrades(gradesData);
        
        // Формируем уникальный список типов оценок
        const uniqueTypesObj: { [key: string]: boolean } = {};
        gradesData.forEach((grade: GradeItem) => {
          if (grade.type) {
            uniqueTypesObj[grade.type] = true;
          }
        });
        const uniqueTypes = Object.keys(uniqueTypesObj);
        setGradeTypes(uniqueTypes);
      } catch (error) {
        console.error('Ошибка при загрузке данных:', error);
        setError('Не удалось загрузить данные. Пожалуйста, попробуйте обновить страницу позже.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Фильтрация оценок при изменении фильтров
  useEffect(() => {
    if (grades.length === 0) return;
    
    let result = [...grades];
    
    // Фильтр по дисциплине
    if (filters.discipline) {
      result = result.filter(grade => grade.discipline_id === filters.discipline);
    }
    
    // Фильтр по типу оценки
    if (filters.gradeType) {
      result = result.filter(grade => grade.type === filters.gradeType);
    }
    
    // Фильтр по датам
    if (filters.startDate && isValid(filters.startDate)) {
      const startDateStr = format(filters.startDate, 'yyyy-MM-dd');
      result = result.filter(grade => grade.date >= startDateStr);
    }
    
    if (filters.endDate && isValid(filters.endDate)) {
      const endDateStr = format(filters.endDate, 'yyyy-MM-dd');
      result = result.filter(grade => grade.date <= endDateStr);
    }
    
    setFilteredGrades(result);
  }, [filters, grades]);
  
  // Обработчики изменения фильтров
  const handleDisciplineChange = (event: SelectChangeEvent) => {
    setFilters(prev => ({ ...prev, discipline: event.target.value }));
  };
  
  const handleStartDateChange = (date: Date | null) => {
    setFilters(prev => ({ ...prev, startDate: date }));
  };
  
  const handleEndDateChange = (date: Date | null) => {
    setFilters(prev => ({ ...prev, endDate: date }));
  };
  
  const handleGradeTypeChange = (event: SelectChangeEvent) => {
    setFilters(prev => ({ ...prev, gradeType: event.target.value }));
  };
  
  const handleResetFilters = () => {
    setFilters({
      discipline: '',
      startDate: null,
      endDate: null,
      gradeType: ''
    });
  };
  
  const handleViewModeChange = (_: React.SyntheticEvent, newValue: 'table' | 'calendar') => {
    setViewMode(newValue);
  };
  
  // Отображение загрузки
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // Отображение ошибки
  if (error) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="lg" sx={{ my: 3 }}>
      <Box sx={{ 
        mb: 3, 
        p: 3,
        borderRadius: 2,
        background: 'linear-gradient(90deg, #144da0 0%, #1976d2 100%)',
        color: 'white',
        boxShadow: '0 4px 8px rgba(20, 77, 160, 0.2)'
      }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold">
          Журнал оценок
        </Typography>
        <Typography variant="body1" sx={{ opacity: 0.9 }}>
          Просмотр всех оценок за период обучения
        </Typography>
      </Box>
      
      {/* Панель фильтров */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          mb: 3, 
          backgroundColor: 'white',
          border: '2px solid rgba(0,0,0,0.1)',
          boxShadow: '0 4px 8px rgba(0,0,0,0.05)',
          borderRadius: 2
        }}
      >
        <Box sx={{ 
          mb: 2, 
          display: 'flex', 
          alignItems: 'center', 
          p: 1,
          pl: 2,
          borderRadius: 1,
          background: 'linear-gradient(90deg, rgba(20, 77, 160, 0.8) 0%, rgba(25, 118, 210, 0.8) 100%)',
          color: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <FilterAlt sx={{ mr: 1, color: 'white' }} />
          <Typography variant="h6">Фильтры</Typography>
        </Box>
        
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="discipline-label">Дисциплина</InputLabel>
              <Select
                labelId="discipline-label"
                id="discipline-select"
                value={filters.discipline}
                label="Дисциплина"
                onChange={handleDisciplineChange}
              >
                <MenuItem value="">Все дисциплины</MenuItem>
                {disciplines.map((discipline) => (
                  <MenuItem key={discipline.discipline_id} value={discipline.discipline_id}>
                    {discipline.discipline_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="grade-type-label">Тип оценки</InputLabel>
              <Select
                labelId="grade-type-label"
                id="grade-type-select"
                value={filters.gradeType}
                label="Тип оценки"
                onChange={handleGradeTypeChange}
              >
                <MenuItem value="">Все типы</MenuItem>
                {gradeTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            {/* Временно заменяем DatePicker на TextField */}
            <TextField
              label="Начало периода"
              size="small"
              fullWidth
              type="date"
              InputLabelProps={{ shrink: true }}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null;
                handleStartDateChange(date);
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            {/* Временно заменяем DatePicker на TextField */}
            <TextField
              label="Конец периода"
              size="small"
              fullWidth
              type="date"
              InputLabelProps={{ shrink: true }}
              onChange={(e) => {
                const date = e.target.value ? new Date(e.target.value) : null;
                handleEndDateChange(date);
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={2} sx={{ display: 'flex', alignItems: 'center' }}>
            <Button
              variant="contained"
              startIcon={<Refresh />}
              onClick={handleResetFilters}
              fullWidth
              sx={{ 
                height: '40px',
                background: 'linear-gradient(90deg, #144da0 0%, #1976d2 100%)',
                boxShadow: '0 2px 4px rgba(25, 118, 210, 0.25)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  background: 'linear-gradient(90deg, #1976d2 0%, #2196f3 100%)',
                  boxShadow: '0 4px 8px rgba(25, 118, 210, 0.25)',
                  transform: 'translateY(-1px)'
                }
              }}
            >
              Сбросить
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {/* Переключатель режимов отображения и статистика */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Tabs
          value={viewMode}
          onChange={handleViewModeChange}
          TabIndicatorProps={{
            style: {
              backgroundColor: '#1976d2',
              height: 3
            }
          }}
          sx={{
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 500,
              fontSize: '1rem',
              minWidth: 120,
              transition: 'all 0.2s',
              borderRadius: '8px 8px 0 0',
              '&:hover': {
                color: '#1976d2',
                opacity: 1
              },
            },
            '& .Mui-selected': {
              color: '#1976d2',
              fontWeight: 700,
            }
          }}
        >
          <Tab 
            value="table" 
            label="Таблица" 
            icon={<TableRows fontSize="small" />} 
            iconPosition="start"
          />
          <Tab 
            value="calendar" 
            label="По месяцам" 
            icon={<CalendarViewMonth fontSize="small" />} 
            iconPosition="start"
          />
        </Tabs>
        
        <Box>
          <Tooltip title="Скачать в Excel">
            <IconButton 
              sx={{ 
                ml: 1,
                p: 1,
                color: 'white',
                background: 'linear-gradient(90deg, #144da0 0%, #1976d2 100%)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #1976d2 0%, #2196f3 100%)',
                  boxShadow: '0 4px 8px rgba(25, 118, 210, 0.25)'
                }
              }}
            >
              <Download />
            </IconButton>
          </Tooltip>
          <Tooltip title="Анализ успеваемости">
            <IconButton 
              sx={{ 
                ml: 1,
                p: 1,
                color: 'white',
                background: 'linear-gradient(90deg, #144da0 0%, #1976d2 100%)',
                '&:hover': {
                  background: 'linear-gradient(90deg, #1976d2 0%, #2196f3 100%)',
                  boxShadow: '0 4px 8px rgba(25, 118, 210, 0.25)'
                }
              }}
            >
              <BarChart />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      {/* Отображение данных в табличном виде */}
      {viewMode === 'table' && (
        <TableContainer 
          component={Paper} 
          sx={{ 
            boxShadow: 'none', 
            border: '2px solid rgba(0,0,0,0.1)',
            mb: 3,
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          <Table sx={{ minWidth: 650 }}>
            <TableHead sx={{ 
              background: 'linear-gradient(90deg, rgba(20, 77, 160, 0.9) 0%, rgba(25, 118, 210, 0.9) 100%)'
            }}>
              <TableRow>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Дисциплина</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Тип</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Дата</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Оценка</TableCell>
                <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Описание</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredGrades.length > 0 ? (
                filteredGrades.map((grade, index) => (
                  <TableRow 
                    key={grade.id}
                    sx={{ 
                      '&:nth-of-type(odd)': { backgroundColor: 'rgba(0, 0, 0, 0.02)' },
                      '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.05)' },
                      transition: 'background-color 0.2s'
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>{grade.discipline_name}</TableCell>
                    <TableCell>{grade.type}</TableCell>
                    <TableCell>{isValid(new Date(grade.date)) ? format(parseISO(grade.date), 'dd.MM.yyyy') : 'Н/Д'}</TableCell>
                    <TableCell>
                      <Box
                        sx={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          bgcolor: `${getGradeColor(grade.value)}20`,
                          color: getGradeColor(grade.value)
                        }}
                      >
                        {grade.value}
                      </Box>
                    </TableCell>
                    <TableCell>{grade.description || '-'}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    <Typography sx={{ py: 3 }}>
                      Нет оценок, соответствующих выбранным фильтрам
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
      
      {/* Отображение данных в календарном виде */}
      {viewMode === 'calendar' && (
        <Paper 
          sx={{ 
            p: 3, 
            boxShadow: 'none', 
            border: '2px solid rgba(0,0,0,0.1)'
          }}
        >
          <Typography variant="h6" sx={{ mb: 2 }}>
            Оценки по месяцам
          </Typography>
          
          {filteredGrades.length > 0 ? (
            <Box>
              {/* Здесь будет календарное представление оценок */}
              <Typography color="text.secondary">
                Календарное представление будет реализовано в следующем обновлении
              </Typography>
            </Box>
          ) : (
            <Typography sx={{ py: 3, textAlign: 'center' }}>
              Нет оценок, соответствующих выбранным фильтрам
            </Typography>
          )}
        </Paper>
      )}
      
      {/* Статистика */}
      {filteredGrades.length > 0 && (
        <Paper 
          sx={{ 
            p: 3, 
            boxShadow: 'none', 
            border: '2px solid rgba(0,0,0,0.1)',
            borderRadius: 2
          }}
        >
          <Box sx={{ 
            mb: 2,
            display: 'flex', 
            alignItems: 'center', 
            p: 1,
            pl: 2,
            borderRadius: 1,
            background: 'linear-gradient(90deg, rgba(20, 77, 160, 0.8) 0%, rgba(25, 118, 210, 0.8) 100%)',
            color: 'white',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <Assessment sx={{ mr: 1 }} />
            <Typography variant="h6">Статистика</Typography>
          </Box>
          
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Box sx={{ 
                textAlign: 'center', 
                p: 2, 
                borderRadius: 2,
                bgcolor: 'rgba(25, 118, 210, 0.1)',
                border: '1px solid rgba(25, 118, 210, 0.2)'
              }}>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {filteredGrades.length}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Всего оценок
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Box sx={{ 
                textAlign: 'center', 
                p: 2,
                borderRadius: 2,
                bgcolor: 'rgba(76, 175, 80, 0.1)',
                border: '1px solid rgba(76, 175, 80, 0.2)'
              }}>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {filteredGrades.length > 0 ? 
                    (filteredGrades.reduce((sum, grade) => sum + parseFloat(grade.value), 0) / filteredGrades.length).toFixed(2) : 
                    '0.00'
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Средний балл
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12} sm={4}>
              <Box sx={{ 
                textAlign: 'center', 
                p: 2,
                borderRadius: 2,
                bgcolor: 'rgba(255, 152, 0, 0.1)',
                border: '1px solid rgba(255, 152, 0, 0.2)'
              }}>
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {
                    filteredGrades.filter(grade => parseFloat(grade.value) >= 4).length > 0 ?
                    `${((filteredGrades.filter(grade => parseFloat(grade.value) >= 4).length / filteredGrades.length) * 100).toFixed(0)}%` :
                    '0%'
                  }
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Хороших и отличных оценок
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
    </Container>
  );
};

export default GradeJournal; 