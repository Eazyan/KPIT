// Типы ролей пользователей
export enum UserRole {
  STUDENT = 'STUDENT',
  TEACHER = 'TEACHER',
  ADMIN = 'ADMIN'
}

// Интерфейс пользователя
export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  token?: string;
  group?: string;
  department?: string;
}

// Типы для расписания
export interface LessonSchedule {
  _id: string;
  subject: string;
  type: 'Лекция' | 'Практика' | 'Лабораторная' | 'Семинар' | 'Экзамен' | 'Зачет';
  time: string;
  date: string;
  teacher: string;
  room: string;
  group: string;
}

// Интерфейс учебной группы
export interface Group {
  _id: string;
  name: string;
  faculty: string;
  year: number;
}

// Интерфейс дисциплины
export interface Discipline {
  _id: string;
  name: string;
  teachers: string[];
  description?: string;
  faculty: string;
}

// Типы занятий
export enum LessonType {
  LECTURE = 'lecture',
  PRACTICE = 'practice',
  LABORATORY = 'laboratory',
  SEMINAR = 'seminar',
  CONSULTATION = 'consultation',
  EXAM = 'exam',
}

// Интерфейс занятия
export interface Lesson {
  _id: string;
  discipline: string;
  date: Date;
  startTime: string;
  endTime: string;
  type: LessonType;
  topic: string;
  group: string;
}

// Статусы посещаемости
export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  EXCUSED = 'excused',
}

// Интерфейс посещаемости
export interface Attendance {
  _id: string;
  student: string;
  lesson: string;
  status: AttendanceStatus;
  reason?: string;
  note?: string;
}

// Интерфейс оценки
export interface Grade {
  _id: string;
  student: string;
  discipline: string;
  score: number;
  type: string;
  date: Date;
  comment?: string;
  weight: number;
} 