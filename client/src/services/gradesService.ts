import { api } from './api';
import { 
  GradeItem, 
  Discipline, 
  GradeStats, 
  ExpulsionData,
  extractDisciplines,
  extractGrades
} from '../utils/gradeUtils';

/**
 * Сервис для работы с API оценок
 */
export class GradesService {
  /**
   * Получение аналитики по оценкам
   */
  static async getAnalytics(): Promise<{
    disciplines: Discipline[],
    stats: GradeStats,
    recentGrades: GradeItem[]
  }> {
    try {
      const response = await api.get('/grades/analytics');
      const data = response.data;
      
      return {
        disciplines: extractDisciplines(data),
        stats: {
          overall_average: data.overall_average || data.overall_stats?.average_grade,
          distribution: data.overall_stats?.distribution || data.distribution || {},
          type_averages: data.type_averages || {},
          disciplines: extractDisciplines(data)
        },
        recentGrades: data.recent_grades || []
      };
    } catch (error) {
      console.error('Ошибка при получении аналитики:', error);
      return {
        disciplines: [],
        stats: {},
        recentGrades: []
      };
    }
  }
  
  /**
   * Получение оценок студента
   */
  static async getStudentGrades(): Promise<{
    grades: GradeItem[],
    stats: GradeStats
  }> {
    try {
      const response = await api.get('/grades/student');
      const data = response.data;
      
      let grades = extractGrades(data);
      let stats = {} as GradeStats;
      
      // Обрабатываем оба формата ответа
      if (typeof data === 'object' && !Array.isArray(data)) {
        if (data.stats) {
          stats = data.stats;
        } else if (data.overall_stats) {
          stats = {
            overall_average: data.overall_average,
            distribution: data.overall_stats.distribution,
            disciplines: extractDisciplines(data)
          };
        }
      }
      
      return { grades, stats };
    } catch (error) {
      console.error('Ошибка при получении оценок студента:', error);
      return { grades: [], stats: {} };
    }
  }
  
  /**
   * Получение всех оценок студента
   */
  static async getAllStudentGrades(): Promise<GradeItem[]> {
    try {
      const response = await api.get('/grades/student/all');
      return extractGrades(response.data);
    } catch (error) {
      console.error('Ошибка при получении всех оценок студента:', error);
      return [];
    }
  }
  
  /**
   * Получение вероятности отчисления
   */
  static async getExpulsionProbability(): Promise<ExpulsionData> {
    try {
      const response = await api.get('/grades/expulsion-probability');
      return response.data || { probability: 0 };
    } catch (error) {
      console.error('Ошибка при получении вероятности отчисления:', error);
      return { probability: 0 };
    }
  }
} 