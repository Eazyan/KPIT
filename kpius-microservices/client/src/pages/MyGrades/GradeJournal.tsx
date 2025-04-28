import React, { useState, useContext } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow,
  Button,
  CircularProgress,
  Tabs,
  Tab,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent
} from '@mui/material';
import { AuthContext } from '../../context/AuthContext';
import { Navigate } from 'react-router-dom';
import { UserRole } from '../../types';

// Интерфейс для данных журнала (заглушка)
interface JournalEntry {
  id: string;
  student: string;
  date: string;
  type: string;
  score: number;
}

// Компонент журнала оценок
const GradeJournal: React.FC = () => {
  const { user, loading } = useContext(AuthContext);
  const [loadingData, setLoadingData] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedDiscipline, setSelectedDiscipline] = useState('');
  
  // Заглушка данных для примера
  const [journalData, setJournalData] = useState<JournalEntry[]>([]);
  const [groups] = useState([
    { id: '1', name: 'Б8120-09.03.03пикд' },
    { id: '2', name: 'Б8119-09.03.03пикд' },
    { id: '3', name: 'Б8121-09.03.03пикд' },
  ]);
  const [disciplines] = useState([
    { id: '1', name: 'Программирование' },
    { id: '2', name: 'Базы данных' },
    { id: '3', name: 'Web-технологии' },
  ]);

  // Проверка авторизации
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Обработчики событий
  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleGroupChange = (event: SelectChangeEvent) => {
    setSelectedGroup(event.target.value);
    loadJournalData(event.target.value, selectedDiscipline);
  };

  const handleDisciplineChange = (event: SelectChangeEvent) => {
    setSelectedDiscipline(event.target.value);
    loadJournalData(selectedGroup, event.target.value);
  };

  // Загрузка данных журнала (заглушка)
  const loadJournalData = (group: string, discipline: string) => {
    if (!group || !discipline) return;
    
    setLoadingData(true);
    
    // Имитация запроса к API
    setTimeout(() => {
      setJournalData([]);
      setLoadingData(false);
    }, 1000);
  };

  // Экспорт данных (заглушка)
  const handleExport = () => {
    alert('Экспорт данных журнала');
  };

  return (
    <Container maxWidth="lg">
      <Box my={4}>
        <Typography variant="h4" component="h1" gutterBottom>
          Журнал оценок
        </Typography>
        
        <Paper sx={{ mb: 3 }}>
          <Tabs 
            value={tabValue} 
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Текущие оценки" />
            <Tab label="Итоговые оценки" />
            <Tab label="Статистика" />
          </Tabs>
        </Paper>
        
        <Paper sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', mb: 3, flexWrap: 'wrap', gap: 2 }}>
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="group-select-label">Группа</InputLabel>
              <Select
                labelId="group-select-label"
                value={selectedGroup}
                label="Группа"
                onChange={handleGroupChange}
              >
                {groups.map(group => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl sx={{ minWidth: 200 }}>
              <InputLabel id="discipline-select-label">Дисциплина</InputLabel>
              <Select
                labelId="discipline-select-label"
                value={selectedDiscipline}
                label="Дисциплина"
                onChange={handleDisciplineChange}
              >
                {disciplines.map(discipline => (
                  <MenuItem key={discipline.id} value={discipline.id}>
                    {discipline.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Box sx={{ flexGrow: 1 }} />
            
            <Button 
              variant="outlined" 
              onClick={handleExport}
              disabled={journalData.length === 0}
            >
              Экспорт
            </Button>
          </Box>
          
          {loadingData ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : journalData.length > 0 ? (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Студент</TableCell>
                    <TableCell>Дата</TableCell>
                    <TableCell>Тип работы</TableCell>
                    <TableCell align="right">Оценка</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {journalData.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell>{entry.student}</TableCell>
                      <TableCell>{entry.date}</TableCell>
                      <TableCell>{entry.type}</TableCell>
                      <TableCell align="right">{entry.score}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Typography variant="body1" align="center" sx={{ py: 4 }}>
              {selectedGroup && selectedDiscipline 
                ? "Нет данных для выбранных параметров" 
                : "Выберите группу и дисциплину для просмотра данных"}
            </Typography>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default GradeJournal; 