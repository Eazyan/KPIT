import React from 'react';
import { 
  Box, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  SelectChangeEvent,
  Button, 
  Stack
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ruLocale from 'date-fns/locale/ru';

// Типы для фильтров
interface ScheduleFilterProps {
  onFilterChange: (filters: ScheduleFilterState) => void;
  groups?: { _id: string; name: string }[];
  teachers?: { _id: string; name: string }[];
}

export interface ScheduleFilterState {
  group?: string;
  teacher?: string;
  date?: Date | null;
  type?: string;
}

const ScheduleFilter: React.FC<ScheduleFilterProps> = ({ 
  onFilterChange, 
  groups = [], 
  teachers = []
}) => {
  const [filters, setFilters] = React.useState<ScheduleFilterState>({
    group: '',
    teacher: '',
    date: null,
    type: ''
  });
  
  // Типы занятий
  const lessonTypes = [
    'Лекция',
    'Практика',
    'Лабораторная',
    'Семинар',
    'Экзамен',
    'Зачет'
  ];
  
  // Обработчики изменения фильтров
  const handleGroupChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setFilters(prev => ({ ...prev, group: value }));
  };
  
  const handleTeacherChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setFilters(prev => ({ ...prev, teacher: value }));
  };
  
  const handleTypeChange = (event: SelectChangeEvent) => {
    const value = event.target.value;
    setFilters(prev => ({ ...prev, type: value }));
  };
  
  const handleDateChange = (date: Date | null) => {
    setFilters(prev => ({ ...prev, date }));
  };
  
  // Применение фильтров
  const applyFilters = () => {
    onFilterChange(filters);
  };
  
  // Сброс фильтров
  const resetFilters = () => {
    const resetState = {
      group: '',
      teacher: '',
      date: null,
      type: ''
    };
    
    setFilters(resetState);
    onFilterChange(resetState);
  };
  
  return (
    <Box sx={{ mb: 4, p: 3, borderRadius: 3, bgcolor: 'rgba(255, 255, 255, 0.7)' }}>
      <Stack spacing={3}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
          {/* Выбор группы */}
          <FormControl sx={{ minWidth: 200, flex: '1 1 200px' }}>
            <InputLabel id="group-select-label">Группа</InputLabel>
            <Select
              labelId="group-select-label"
              id="group-select"
              value={filters.group}
              label="Группа"
              onChange={handleGroupChange}
            >
              <MenuItem value="">Все группы</MenuItem>
              {groups.map(group => (
                <MenuItem key={group._id} value={group._id}>
                  {group.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Выбор преподавателя */}
          <FormControl sx={{ minWidth: 200, flex: '1 1 200px' }}>
            <InputLabel id="teacher-select-label">Преподаватель</InputLabel>
            <Select
              labelId="teacher-select-label"
              id="teacher-select"
              value={filters.teacher}
              label="Преподаватель"
              onChange={handleTeacherChange}
            >
              <MenuItem value="">Все преподаватели</MenuItem>
              {teachers.map(teacher => (
                <MenuItem key={teacher._id} value={teacher._id}>
                  {teacher.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Выбор типа занятия */}
          <FormControl sx={{ minWidth: 200, flex: '1 1 200px' }}>
            <InputLabel id="type-select-label">Тип занятия</InputLabel>
            <Select
              labelId="type-select-label"
              id="type-select"
              value={filters.type}
              label="Тип занятия"
              onChange={handleTypeChange}
            >
              <MenuItem value="">Все типы</MenuItem>
              {lessonTypes.map(type => (
                <MenuItem key={type} value={type}>
                  {type}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          {/* Выбор даты */}
          <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ruLocale}>
            <DatePicker 
              label="Дата"
              value={filters.date}
              onChange={handleDateChange}
              slotProps={{ textField: { sx: { minWidth: 200, flex: '1 1 200px' } } }}
            />
          </LocalizationProvider>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
          <Button 
            variant="outlined" 
            onClick={resetFilters}
            sx={{ minWidth: 120 }}
          >
            Сбросить
          </Button>
          <Button 
            variant="contained" 
            onClick={applyFilters}
            sx={{ minWidth: 120 }}
          >
            Применить
          </Button>
        </Box>
      </Stack>
    </Box>
  );
};

export default ScheduleFilter; 