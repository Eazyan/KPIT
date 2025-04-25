import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Grid, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  Button, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  IconButton,
  SelectChangeEvent,
  CircularProgress,
  Tooltip,
  Alert,
  Tab,
  Tabs,
  Card,
  CardContent,
  TextField
} from '@mui/material';
import { 
  Edit, 
  DeleteOutline, 
  Add,
  Assessment,
  BarChart,
  TableView,
  Save,
  Close,
  Visibility
} from '@mui/icons-material';
import { api } from '../../services/api';
import Swal from 'sweetalert2';
import {
  BarChart as RechartsBarChart,
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

// Типы для sweetalert2
declare module 'sweetalert2';

interface Group {
  id: string;
  name: string;
  specialization?: string;
  course?: number;
}

interface Subject {
  id: string;
  name: string;
  semester?: number;
}

interface Student {
  id: string;
  fullName: string;
  group?: string;
  email?: string;
}

interface GradeRecord {
  id?: string;
  studentId: string;
  disciplineId: string;
  value: number;
  type: string;
  date: string;
  description?: string;
  weight?: number;
}

interface GradeDistribution {
  name: string;
  value: number;
  color: string;
}

// Цвета для графиков и оценок 
const COLORS = ['#f44336', '#ff9800', '#ffeb3b', '#8bc34a', '#4caf50'];
const GRADE_TYPES = [
  { value: 'exam', label: 'Экзамен' },
  { value: 'test', label: 'Тест' },
  { value: 'homework', label: 'Домашнее задание' },
  { value: 'project', label: 'Проект' },
  { value: 'activity', label: 'Активность' },
  { value: 'lab', label: 'Лабораторная работа' },
];

const TeacherGrades: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [studentGrades, setStudentGrades] = useState<Map<string, {value: number, type: string, description?: string, id?: string}>>(new Map());
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
  const [averageGrade, setAverageGrade] = useState<number>(0);
  const [tabValue, setTabValue] = useState<number>(0);
  const [loadingStudents, setLoadingStudents] = useState<Record<string, boolean>>({});
  
  // Загрузка групп при первом рендере
  useEffect(() => {
    fetchGroups();
  }, []);
  
  // Загрузка предметов при выборе группы
  useEffect(() => {
    if (selectedGroup) {
      fetchSubjects();
    } else {
      setSubjects([]);
      setSelectedSubject('');
    }
  }, [selectedGroup]);
  
  // Загрузка студентов и оценок при выборе предмета
  useEffect(() => {
    if (selectedGroup && selectedSubject) {
      fetchStudents();
      fetchGrades();
    } else {
      setStudents([]);
      setStudentGrades(new Map());
    }
  }, [selectedGroup, selectedSubject, selectedDate]);
  
  // Обработчики изменения значений в селектах
  const handleGroupChange = (event: SelectChangeEvent) => {
    setSelectedGroup(event.target.value);
  };
  
  const handleSubjectChange = (event: SelectChangeEvent) => {
    setSelectedSubject(event.target.value);
  };
  
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  // Функция загрузки групп
  const fetchGroups = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/attendance/groups');
      setGroups(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке групп:', error);
      setError('Не удалось загрузить список групп');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция загрузки предметов для выбранной группы
  const fetchSubjects = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/attendance/disciplines', {
        params: { group_id: selectedGroup }
      });
      setSubjects(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке предметов:', error);
      setError('Не удалось загрузить список предметов');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция загрузки студентов для выбранной группы
  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const response = await api.get('/attendance/students', {
        params: { group_id: selectedGroup }
      });
      setStudents(response.data);
    } catch (error) {
      console.error('Ошибка при загрузке студентов:', error);
      setError('Не удалось загрузить список студентов');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция загрузки оценок
  const fetchGrades = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/grades/discipline/${selectedSubject}/all`);
      
      // Создаем Map для быстрого доступа к оценкам по ID студента
      const gradesMap = new Map<string, {value: number, type: string, description?: string, id?: string}>();
      
      // Сортируем оценки по дате (сначала новые)
      const sortedGrades = [...response.data].sort((a, b) => {
        // Предполагаем, что created_at или date - поле даты
        const dateA = a.created_at || a.date || '';
        const dateB = b.created_at || b.date || '';
        return String(dateB).localeCompare(String(dateA));
      });
      
      // Берем только последнюю (самую новую) оценку для каждого студента
      sortedGrades.forEach((grade: any) => {
        if (grade.student_id && !gradesMap.has(grade.student_id)) {
          gradesMap.set(grade.student_id, {
            value: grade.value,
            type: grade.type,
            description: grade.description,
            id: grade._id
          });
        }
      });
      
      setStudentGrades(gradesMap);
      
      // Рассчитываем распределение оценок
      const distribution = [
        { name: "1", value: 0, color: COLORS[0] },
        { name: "2", value: 0, color: COLORS[1] },
        { name: "3", value: 0, color: COLORS[2] },
        { name: "4", value: 0, color: COLORS[3] },
        { name: "5", value: 0, color: COLORS[4] }
      ];
      
      let gradeSum = 0;
      let gradeCount = 0;
      
      // Для статистики считаем ВСЕ оценки, а не только последние
      response.data.forEach((grade: any) => {
        if (grade.value >= 1 && grade.value <= 5) {
          distribution[grade.value - 1].value += 1;
          gradeSum += Number(grade.value);
          gradeCount += 1;
        }
      });
      
      setGradeDistribution(distribution);
      
      // Рассчитываем средний балл
      setAverageGrade(gradeCount > 0 ? gradeSum / gradeCount : 0);
      
    } catch (error) {
      console.error('Ошибка при загрузке оценок:', error);
      setError('Не удалось загрузить оценки');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция добавления/редактирования оценки
  const handleEditGrade = (studentId: string, currentGrade?: number) => {
    const student = students.find((s) => s.id === studentId);
    
    if (!student) {
      console.error('Не удалось найти информацию о студенте');
      return;
    }
    
    Swal.fire({
      title: `${currentGrade ? 'Изменение' : 'Добавление'} оценки`,
      html: `
        <div class="swal2-html-container">
          <p>Студент: <b>${student.fullName}</b></p>
          <div class="form-group">
            <label for="grade-value">Оценка:</label>
            <select id="grade-value" class="swal2-select">
              <option value="5" ${currentGrade === 5 ? 'selected' : ''}>5 (Отлично)</option>
              <option value="4" ${currentGrade === 4 ? 'selected' : ''}>4 (Хорошо)</option>
              <option value="3" ${currentGrade === 3 ? 'selected' : ''}>3 (Удовлетворительно)</option>
              <option value="2" ${currentGrade === 2 ? 'selected' : ''}>2 (Неудовлетворительно)</option>
              <option value="1" ${currentGrade === 1 ? 'selected' : ''}>1 (Очень плохо)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="grade-type">Тип оценки:</label>
            <select id="grade-type" class="swal2-select">
              ${GRADE_TYPES.map(type => `<option value="${type.value}">${type.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="grade-description">Комментарий:</label>
            <input id="grade-description" class="swal2-input" placeholder="Например: Контрольная работа №1">
          </div>
          <div class="form-group">
            <label for="grade-weight">Вес оценки:</label>
            <input id="grade-weight" type="number" class="swal2-input" placeholder="1.0" min="0.1" max="10" step="0.1" value="1.0">
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: currentGrade ? 'Изменить' : 'Добавить',
      cancelButtonText: 'Отмена',
      preConfirm: () => {
        const gradeValue = Number((document.getElementById('grade-value') as HTMLSelectElement).value);
        const gradeType = (document.getElementById('grade-type') as HTMLSelectElement).value;
        const description = (document.getElementById('grade-description') as HTMLInputElement).value;
        const weight = Number((document.getElementById('grade-weight') as HTMLInputElement).value);
        
        if (isNaN(gradeValue) || gradeValue < 1 || gradeValue > 5) {
          Swal.showValidationMessage('Неверное значение оценки');
          return false;
        }
        
        if (isNaN(weight) || weight <= 0 || weight > 10) {
          Swal.showValidationMessage('Вес оценки должен быть от 0.1 до 10');
          return false;
        }
        
        return { gradeValue, gradeType, description, weight };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        saveGrade(studentId, result.value.gradeValue, result.value.gradeType, result.value.description, result.value.weight);
      }
    });
  };
  
  // Функция сохранения оценки
  const saveGrade = async (studentId: string, value: number, type: string, description: string, weight: number) => {
    try {
      setIsLoading(true);
      setLoadingStudents(prev => ({ ...prev, [studentId]: true }));
      
      const gradeData = {
        student_id: studentId,
        discipline_id: selectedSubject,
        grade_value: value,
        grade_type: type,
        description: description,
        weight: weight,
        date: selectedDate
      };
      
      const response = await api.post('/grades/add', null, { params: gradeData });
      
      // Обновляем оценки в состоянии
      setStudentGrades(prevGrades => {
        const newGrades = new Map(prevGrades);
        newGrades.set(studentId, {
          value: value,
          type: type,
          description: description
        });
        return newGrades;
      });
      
      Swal.fire({
        title: 'Успех!',
        text: 'Оценка успешно сохранена',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
      
      // Обновляем данные
      fetchGrades();
      
      setSuccess('Оценка успешно сохранена');
    } catch (error: any) {
      console.error('Ошибка при сохранении оценки:', error);
      
      Swal.fire({
        title: 'Ошибка!',
        text: `Не удалось сохранить оценку: ${error.response?.data?.detail || error.message}`,
        icon: 'error'
      });
      
      setError(`Не удалось сохранить оценку: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsLoading(false);
      setLoadingStudents(prev => ({ ...prev, [studentId]: false }));
    }
  };
  
  // Функция удаления оценки
  const handleDeleteGrade = (studentId: string) => {
    const student = students.find((s) => s.id === studentId);
    const grade = studentGrades.get(studentId);
    
    if (!student || !grade) {
      console.error('Не удалось найти информацию о студенте или оценке');
      return;
    }
    
    if (!grade.id) {
      Swal.fire({
        title: 'Ошибка',
        text: 'Не удалось идентифицировать оценку для удаления',
        icon: 'error'
      });
      return;
    }
    
    Swal.fire({
      title: 'Удаление оценки',
      html: `<p>Вы уверены, что хотите удалить оценку студента <b>${student.fullName}</b>?</p>
             <p>Значение: <b>${grade.value}</b>, тип: <b>${getGradeTypeName(grade.type)}</b></p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Удалить',
      cancelButtonText: 'Отмена'
    }).then((result) => {
      if (result.isConfirmed) {
        deleteGrade(grade.id as string);
      }
    });
  };
  
  // Функция удаления оценки по ID
  const deleteGrade = async (gradeId: string) => {
    try {
      setIsLoading(true);
      
      // Получаем данные об оценке, которую нужно удалить
      const gradeToDelete = Array.from(studentGrades.entries())
        .find(([_, grade]) => grade.id === gradeId);
      
      if (!gradeToDelete) {
        throw new Error("Оценка не найдена");
      }
      
      const studentId = gradeToDelete[0]; // ID студента
      const gradeInfo = gradeToDelete[1]; // Информация об оценке
            
      // Новый API endpoint для удаления конкретной оценки
      const response = await api.delete(`/grades/${gradeId}`);
      
      // Обновляем состояние после успешного удаления
      setStudentGrades(prevGrades => {
        const newGrades = new Map(prevGrades);
        newGrades.delete(studentId);
        return newGrades;
      });
      
      // Обновляем данные
      await fetchGrades();
      
      Swal.fire({
        title: 'Успешно',
        text: response.data.message || 'Оценка успешно удалена',
        icon: 'success'
      });
    } catch (error) {
      console.error('Ошибка при удалении оценки:', error);
      Swal.fire({
        title: 'Ошибка',
        text: 'Не удалось удалить оценку. Пожалуйста, попробуйте еще раз.',
        icon: 'error'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция массового выставления оценок
  const handleBulkAddGrades = () => {
    Swal.fire({
      title: 'Массовое выставление оценок',
      html: `
        <div class="swal2-html-container">
          <div class="form-group">
            <label for="grade-value">Оценка:</label>
            <select id="grade-value" class="swal2-select">
              <option value="5">5 (Отлично)</option>
              <option value="4">4 (Хорошо)</option>
              <option value="3">3 (Удовлетворительно)</option>
              <option value="2">2 (Неудовлетворительно)</option>
              <option value="1">1 (Очень плохо)</option>
            </select>
          </div>
          <div class="form-group">
            <label for="grade-type">Тип оценки:</label>
            <select id="grade-type" class="swal2-select">
              ${GRADE_TYPES.map(type => `<option value="${type.value}">${type.label}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label for="grade-description">Комментарий:</label>
            <input id="grade-description" class="swal2-input" placeholder="Например: Контрольная работа №1">
          </div>
          <div class="form-group">
            <label for="grade-weight">Вес оценки:</label>
            <input id="grade-weight" type="number" class="swal2-input" placeholder="1.0" min="0.1" max="10" step="0.1" value="1.0">
          </div>
          <p><b>Внимание!</b> Оценка будет выставлена всем студентам в списке.</p>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: 'Выставить всем',
      cancelButtonText: 'Отмена',
      preConfirm: () => {
        const gradeValue = Number((document.getElementById('grade-value') as HTMLSelectElement).value);
        const gradeType = (document.getElementById('grade-type') as HTMLSelectElement).value;
        const description = (document.getElementById('grade-description') as HTMLInputElement).value;
        const weight = Number((document.getElementById('grade-weight') as HTMLInputElement).value);
        
        if (isNaN(gradeValue) || gradeValue < 1 || gradeValue > 5) {
          Swal.showValidationMessage('Неверное значение оценки');
          return false;
        }
        
        if (isNaN(weight) || weight <= 0 || weight > 10) {
          Swal.showValidationMessage('Вес оценки должен быть от 0.1 до 10');
          return false;
        }
        
        return { gradeValue, gradeType, description, weight };
      }
    }).then((result) => {
      if (result.isConfirmed) {
        Swal.fire({
          title: 'Подтверждение',
          text: `Вы уверены, что хотите выставить оценку "${result.value.gradeValue}" всем студентам?`,
          icon: 'question',
          showCancelButton: true,
          confirmButtonText: 'Да, выставить всем',
          cancelButtonText: 'Отмена'
        }).then((confirmResult) => {
          if (confirmResult.isConfirmed) {
            bulkAddGrades(result.value.gradeValue, result.value.gradeType, result.value.description, result.value.weight);
          }
        });
      }
    });
  };
  
  // Функция массового сохранения оценок
  const bulkAddGrades = async (value: number, type: string, description: string, weight: number) => {
    try {
      setIsLoading(true);
      
      // Создаем массив промисов для всех запросов
      const promises = students.map(student => {
        const gradeData = {
          student_id: student.id,
          discipline_id: selectedSubject,
          grade_value: value,
          grade_type: type,
          description: description,
          weight: weight,
          date: selectedDate
        };
        
        return api.post('/grades/add', null, { params: gradeData });
      });
      
      // Выполняем все запросы параллельно
      await Promise.all(promises);
      
      Swal.fire({
        title: 'Успех!',
        text: `Оценки успешно выставлены всем студентам (${students.length})`,
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
      });
      
      // Обновляем данные
      fetchGrades();
      
      setSuccess('Оценки успешно выставлены всем студентам');
    } catch (error: any) {
      console.error('Ошибка при массовом выставлении оценок:', error);
      
      Swal.fire({
        title: 'Ошибка!',
        text: `Не удалось выставить оценки: ${error.response?.data?.detail || error.message}`,
        icon: 'error'
      });
      
      setError(`Не удалось выставить оценки: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Функция для получения цвета оценки
  const getGradeColor = (grade: number) => {
    if (grade === 5) return '#4caf50'; // Зеленый
    if (grade === 4) return '#8bc34a'; // Светло-зеленый
    if (grade === 3) return '#ffeb3b'; // Желтый
    if (grade === 2) return '#ff9800'; // Оранжевый
    return '#f44336'; // Красный
  };
  
  // Функция для получения текстового названия типа оценки
  const getGradeTypeName = (type: string): string => {
    const gradeType = GRADE_TYPES.find(t => t.value === type);
    return gradeType ? gradeType.label : 'Оценка';
  };
  
  // Определяем содержимое вкладок
  const renderTabs = () => (
    <Box sx={{ mt: 3, mb: 2 }}>
      <Tabs
        value={tabValue}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Журнал оценок" icon={<TableView />} iconPosition="start" />
        <Tab label="Статистика" icon={<BarChart />} iconPosition="start" />
      </Tabs>
    </Box>
  );
  
  // Содержимое вкладки журнала оценок
  const renderJournalTab = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell>№</TableCell>
            <TableCell>ФИО студента</TableCell>
            <TableCell align="center">Текущая оценка</TableCell>
            <TableCell align="center">Действия</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {students.map((student, index) => {
            const grade = studentGrades.get(student.id);
            return (
              <TableRow key={student.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell>{student.fullName}</TableCell>
                <TableCell align="center">
                  {grade ? (
                    <>
                      <Box 
                        sx={{ 
                          display: 'inline-block', 
                          fontWeight: 'bold', 
                          backgroundColor: getGradeColor(grade.value),
                          color: 'white',
                          borderRadius: '50%',
                          width: 36,
                          height: 36,
                          lineHeight: '36px',
                          textAlign: 'center',
                          fontSize: '16px',
                          marginRight: 1
                        }}
                      >
                        {grade.value}
                      </Box>
                      <Typography 
                        variant="caption" 
                        sx={{ display: 'block', color: 'text.secondary', fontSize: '0.7rem' }}
                        title={grade.description || ''}
                      >
                        {getGradeTypeName(grade.type)}
                      </Typography>
                    </>
                  ) : (
                    <Button 
                      variant="outlined" 
                      onClick={() => handleEditGrade(student.id)}
                      disabled={isLoading || loadingStudents[student.id]}
                    >
                      Выставить
                    </Button>
                  )}
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                    <Tooltip title={grade ? "Изменить оценку" : "Добавить оценку"}>
                      <IconButton 
                        color="primary" 
                        onClick={() => handleEditGrade(student.id, grade?.value)}
                        disabled={isLoading || loadingStudents[student.id]}
                      >
                        {loadingStudents[student.id] ? (
                          <CircularProgress size={24} />
                        ) : (
                          grade ? <Edit /> : <Add />
                        )}
                      </IconButton>
                    </Tooltip>
                    
                    {grade && (
                      <Tooltip title="Удалить оценку">
                        <IconButton
                          color="error"
                          onClick={() => handleDeleteGrade(student.id)}
                          disabled={isLoading || loadingStudents[student.id]}
                        >
                          <DeleteOutline />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
  
  // Содержимое вкладки статистики
  const renderStatsTab = () => (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Распределение оценок
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gradeDistribution}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ name, percent }: { name: string, percent: number }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Средний балл: {averageGrade.toFixed(2)}
            </Typography>
            <Box sx={{ height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={gradeDistribution}
                  layout="vertical"
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" />
                  <RechartsTooltip />
                  <Bar dataKey="value" name="Количество оценок">
                    {gradeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
  
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Журнал оценок
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel id="group-select-label">Группа</InputLabel>
              <Select
                labelId="group-select-label"
                id="group-select"
                value={selectedGroup}
                label="Группа"
                onChange={handleGroupChange}
              >
                {groups.length > 0 ? (
                  groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>
                      {group.name}
                    </MenuItem>
                  ))
                ) : (
                  <MenuItem disabled value="">
                    Нет доступных групп
                  </MenuItem>
                )}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth disabled={!selectedGroup}>
              <InputLabel id="subject-select-label">Предмет</InputLabel>
              <Select
                labelId="subject-select-label"
                id="subject-select"
                value={selectedSubject}
                label="Предмет"
                onChange={handleSubjectChange}
              >
                {subjects.map((subject) => (
                  <MenuItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <TextField
              fullWidth
              label="Дата"
              type="date"
              value={selectedDate}
              onChange={handleDateChange}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              disabled={!selectedGroup || !selectedSubject}
              onClick={handleBulkAddGrades}
              startIcon={<Add />}
            >
              Выставить всем
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {isLoading && !students.length ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {students.length > 0 ? (
            <>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                Найдено студентов: {students.length}. 
                Имеют оценки: {Array.from(studentGrades.keys()).length}.
              </Typography>
              
              {renderTabs()}
              
              {tabValue === 0 ? renderJournalTab() : renderStatsTab()}
            </>
          ) : selectedGroup && selectedSubject ? (
            <Alert severity="info">
              В выбранной группе нет студентов или не загружены данные
            </Alert>
          ) : (
            <Alert severity="info">
              Выберите группу и предмет для просмотра журнала оценок
            </Alert>
          )}
        </>
      )}
    </Container>
  );
};

export default TeacherGrades; 