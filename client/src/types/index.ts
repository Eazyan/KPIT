// Типы ролей пользователей
export enum UserRole {
  STUDENT = 'student',
  TEACHER = 'teacher',
  ADMIN = 'admin',
  HEAD_OF_DEPARTMENT = 'head_of_department'
}

// Интерфейс пользователя
export interface User {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  group?: string;
  department?: string;
  token?: string;
}

// Интерфейс учебной группы
export interface Group {
  _id: string;
  name: string;
  department: string;
  specialization: string;
  course: number;
  students: string[];
}

// Интерфейс дисциплины
export interface Discipline {
  _id: string;
  name: string;
  teacher: string;
  semester: number;
  groups: string[];
  department: string;
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