/**
 * Утилиты для работы с оценками
 */

// Интерфейсы для типизации данных
export interface Discipline {
  id?: string;
  discipline_id: string;
  discipline_name: string;
  semester?: number;
  average_grade?: number | string;
  grades_count?: number;
}

export interface GradeItem {
  id: string;
  value: string;
  discipline_id: string;
  discipline_name: string;
  date: string;
  type: string;
  description?: string;
}

export interface GradeStats {
  overall_average?: number;
  average?: number; 
  average_grade?: number;
  distribution?: { [key: string]: number };
  type_averages?: { [key: string]: number };
  disciplines?: Discipline[];
}

export interface GradeJournalFilters {
  discipline: string;
  startDate: Date | null;
  endDate: Date | null;
  gradeType: string;
}

export interface ExpulsionData {
  probability: number;
  category?: string;
  color?: string;
}

export const RISK_COLORS = {
  none: '#4caf50',     // Зеленый для отсутствия риска
  low: '#8bc34a',      // Светло-зеленый для низкого риска
  medium: '#ffd54f',   // Теплый золотой для среднего риска
  high: '#ff9800',     // Оранжевый для высокого риска
  critical: '#f44336'  // Красный для критического риска
};

/**
 * Получение цвета для отображения оценки
 */
export const getGradeColor = (grade: string | number): string => {
  const numGrade = typeof grade === 'string' ? parseFloat(grade) : grade;
  
  if (numGrade >= 4.5) return '#4caf50';
  if (numGrade >= 4.0) return '#8bc34a';
  if (numGrade >= 3.0) return '#ffb74d';
  return '#f44336'; // Красный цвет для оценок 2 и ниже
};

/**
 * Получение категории риска отчисления
 */
export const getRiskCategory = (probability: number): { category: string, color: string } => {
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

/**
 * Получение среднего балла из различных форматов данных
 */
export const extractAverageGrade = (data: any, fallbackValue: string = "0.00"): string => {
  if (!data) return fallbackValue;
  
  // Проверяем все возможные пути к значению среднего балла
  if (data.overall_stats && typeof data.overall_stats.average === 'number') {
    return data.overall_stats.average.toFixed(2);
  }
  
  if (data.overall_stats && typeof data.overall_stats.average === 'string' && 
     !isNaN(parseFloat(data.overall_stats.average))) {
    return parseFloat(data.overall_stats.average).toFixed(2);
  }
  
  if (typeof data.overall_average === 'number') {
    return data.overall_average.toFixed(2);
  } 
  
  if (typeof data.overall_average === 'string' && !isNaN(parseFloat(data.overall_average))) {
    return parseFloat(data.overall_average).toFixed(2);
  }
  
  if (data.overall_stats && typeof data.overall_stats.average_grade === 'number') {
    return data.overall_stats.average_grade.toFixed(2);
  }
  
  if (data.overall_stats && typeof data.overall_stats.average_grade === 'string' && 
     !isNaN(parseFloat(data.overall_stats.average_grade))) {
    return parseFloat(data.overall_stats.average_grade).toFixed(2);
  }
  
  if (typeof data.average_grade === 'number') {
    return data.average_grade.toFixed(2);
  }
  
  if (typeof data.average_grade === 'string' && !isNaN(parseFloat(data.average_grade))) {
    return parseFloat(data.average_grade).toFixed(2);
  }
  
  return fallbackValue;
};

/**
 * Вычисление тренда на основе оценок
 */
export const calculateGradeTrend = (grades: GradeItem[]): string => {
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

/**
 * Получение текста тренда оценок
 */
export const getTrendText = (trend: string): string => {
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

/**
 * Получение иконки и цвета тренда
 */
export const getTrendIconAndColor = (trend: string): { icon: string, color: string } => {
  switch (trend) {
    case 'improving':
    case 'rapidly_improving':
      return { icon: 'TrendingUp', color: '#4caf50' };
    case 'declining':
    case 'rapidly_declining':
      return { icon: 'TrendingDown', color: '#f44336' };
    case 'stable':
      return { icon: 'TrendingFlat', color: '#ffd54f' };
    default:
      return { icon: 'TrendingFlat', color: '#9e9e9e' };
  }
};

/**
 * Подсчет процента хороших и отличных оценок
 */
export const calculateGoodGradePercentage = (distribution: { [key: string]: number } = {}): number => {
  const total = Object.values(distribution).reduce((sum, count) => sum + count, 0);
  if (total === 0) return 0;
  
  // Хорошие оценки - 4 и 5
  const goodGrades = (distribution['4'] || 0) + (distribution['5'] || 0);
  return Math.round((goodGrades / total) * 100);
};

/**
 * Извлечение списка дисциплин из данных API
 */
export const extractDisciplines = (data: any): Discipline[] => {
  if (!data) return [];
  
  // Проверяем разные пути к данным о дисциплинах
  if (Array.isArray(data.grades_by_discipline)) {
    return data.grades_by_discipline;
  }
  
  if (Array.isArray(data.disciplines)) {
    return data.disciplines;
  }
  
  // Поиск массива объектов, подходящего под формат дисциплин
  if (typeof data === 'object' && data !== null) {
    const possibleDisciplines = Object.values(data)
      .filter(val => Array.isArray(val))
      .find((val: any) => {
        if (!Array.isArray(val) || val.length === 0) return false;
        return typeof val[0] === 'object' && val[0] !== null && 'discipline_name' in val[0];
      }) as Discipline[] | undefined;
          
    if (possibleDisciplines) {
      return possibleDisciplines;
    }
  }
  
  return [];
};

/**
 * Получение оценок из данных API
 */
export const extractGrades = (data: any): GradeItem[] => {
  if (!data) return [];
  
  if (Array.isArray(data)) {
    return data;
  }
  
  if (data.grades && Array.isArray(data.grades)) {
    return data.grades;
  }
  
  if (data.recent_grades && Array.isArray(data.recent_grades)) {
    return data.recent_grades;
  }
  
  return [];
}; 