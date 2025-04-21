import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Dialog,
  DialogContent,
  DialogActions,
  IconButton,
  SelectChangeEvent,
  CircularProgress,
  Tooltip,
  Alert
} from '@mui/material';
import { 
  Close, 
  QrCode2, 
  DeleteOutline, 
  CheckCircleOutline, 
  RadioButtonUnchecked, 
  BugReport, 
  QuestionMark, 
  Sick, 
  LocalHospital,
  Visibility
} from '@mui/icons-material';
import { QRCodeCanvas } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import Swal from 'sweetalert2';
import { FaTrash } from 'react-icons/fa';

// Интерфейс для типизации записи посещаемости с сервера
interface AttendanceServerRecord {
  student_id: string;
  name: string;
  fullName?: string;
  status: string;
  updated_at?: string | null;
}

interface Group {
  id: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
}

interface Student {
  id: string;  // Используем строку вместо числа для id
  fullName: string;
  status?: string;
}

interface AttendanceRecord {
  studentId: string;  // Используем строку вместо числа для studentId
  status: string;
}

// Типы для sweetalert2
declare module 'sweetalert2';
// Типы для react-icons/fa
declare module 'react-icons/fa';

const TeacherAttendance: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [openQRDialog, setOpenQRDialog] = useState<boolean>(false);
  const [qrValue, setQrValue] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const autoRefreshRef = useRef<NodeJS.Timeout | null>(null);
  
  // Состояния для управления диалогом подтверждения удаления
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const navigate = useNavigate();

  const [loadingStudents, setLoadingStudents] = useState<Record<string, boolean>>({});
  // Маппинг для хранения ID и статусов студентов для быстрого доступа
  const [studentStatusMap, setStudentStatusMap] = useState<Map<string, string>>(new Map());

  // Флаг, который указывает, что данные были загружены хотя бы один раз
  const [initialDataLoaded, setInitialDataLoaded] = useState<boolean>(false);

  // Загрузка групп при монтировании компонента
  useEffect(() => {
    const fetchGroups = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/attendance/groups');
        console.log('Полученные группы:', response.data);
        setGroups(response.data);
      } catch (error) {
        console.error('Ошибка при загрузке групп:', error);
        setError('Не удалось загрузить список групп');
      } finally {
        setIsLoading(false);
      }
    };

    fetchGroups();

    // Очистка при размонтировании
    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, []);

  // Загрузка предметов при выборе группы
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!selectedGroup) return;
      
      try {
        setIsLoading(true);
        console.log(`Начало загрузки предметов для группы: ${selectedGroup}`);
        
        const response = await api.get(`/attendance/disciplines?group_id=${selectedGroup}`);
        console.log('Полученные предметы:', response.data);
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          setSubjects(response.data);
          
          // Проверяем, есть ли предмет "Программирование" или похожие в списке
          const programmingSubjects = response.data.filter(subject => 
            subject.name.toLowerCase().includes('програм') || 
            subject.name.toLowerCase().includes('program')
          );
          
          if (programmingSubjects.length > 0) {
            console.log('Найдены предметы программирования:', programmingSubjects);
          }
        } else {
          console.warn('Получен пустой список предметов для группы:', selectedGroup);
          setError('Нет доступных предметов для выбранной группы');
        }
      } catch (error) {
        console.error('Ошибка при загрузке предметов:', error);
        setError('Не удалось загрузить список предметов');
      } finally {
        setIsLoading(false);
      }
    };

    // Сбросим выбранный предмет при смене группы
    setSelectedSubject('');
    // Сбросим данные о посещаемости
    setAttendanceRecords([]);
    // Сбросим данные о студентах
    setStudents([]);
    // Сбросим карту статусов
    setStudentStatusMap(new Map());
    // Сбросим флаг загрузки данных
    setInitialDataLoaded(false);

    fetchSubjects();
  }, [selectedGroup]);

  // Загрузка студентов при выборе группы
  useEffect(() => {
    const fetchStudents = async () => {
      if (!selectedGroup) return;
      
      try {
        setIsLoading(true);
        const selectedGroupObj = groups.find(g => g.id === selectedGroup);
        if (!selectedGroupObj) {
          console.error('Группа не найдена по ID:', selectedGroup);
          console.error('Доступные группы:', groups);
          setIsLoading(false);
          return;
        }
        
        const groupName = selectedGroupObj.name;
        console.log('Загрузка студентов для группы:', groupName);
        console.log('API URL:', `/attendance/students?group_name=${encodeURIComponent(groupName)}`);
        
        const response = await api.get(`/attendance/students?group_name=${encodeURIComponent(groupName)}`);
        console.log('Получены студенты, сырые данные:', response.data);
        
        if (!Array.isArray(response.data)) {
          console.error('Полученные данные не являются массивом:', response.data);
          setError('Данные о студентах имеют неверный формат');
          setIsLoading(false);
          return;
        }
        
        if (response.data.length === 0) {
          console.warn('Получен пустой список студентов для группы:', groupName);
          setError(`Нет доступных студентов для группы ${groupName}`);
        }
        
        // Инициализируем студентов с состоянием "отсутствует" по умолчанию
        const loadedStudents = response.data.map((student: any) => ({
          ...student,
          id: student.id.toString(),
          status: 'Н'  // Н - отсутствует (по умолчанию)
        }));
        
        console.log('Подготовленные данные о студентах:', loadedStudents);
        setStudents(loadedStudents);
        
        // Инициализируем карту статусов
        const newStatusMap = new Map<string, string>();
        loadedStudents.forEach((student: Student) => {
          newStatusMap.set(student.id, 'Н');
        });
        setStudentStatusMap(newStatusMap);
        console.log('Карта статусов инициализирована для', loadedStudents.length, 'студентов');
        
      } catch (error: any) {
        console.error('Ошибка при загрузке студентов:', error);
        if (error.response) {
          console.error('Данные ответа API:', error.response.data);
          console.error('Статус ответа API:', error.response.status);
        }
        setError('Не удалось загрузить список студентов');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStudents();
  }, [selectedGroup, groups]);

  // Функция для загрузки данных о посещаемости
  const fetchAttendance = async (showLoading = true) => {
    if (!selectedGroup || !selectedSubject || !selectedDate) {
      console.warn(`Не все параметры заданы для загрузки посещаемости:
        - Группа: ${selectedGroup || 'не выбрана'}
        - Предмет: ${selectedSubject || 'не выбран'}
        - Дата: ${selectedDate || 'не выбрана'}
      `);
      return;
    }
    
    if (showLoading) {
      setIsLoading(true);
    }
    
    try {
      setError(null);
      
      // Найдем информацию о группе для формирования запроса
      const selectedGroupObj = groups.find(g => g.id === selectedGroup);
      if (!selectedGroupObj) {
        console.error('Группа не найдена для запроса посещаемости:', selectedGroup);
        setError('Ошибка: группа не найдена');
        return;
      }
      
      // Проверяем, существует ли выбранный предмет
      const selectedSubjectObj = subjects.find(s => s.id === selectedSubject);
      if (!selectedSubjectObj) {
        console.error('Предмет не найден для запроса посещаемости:', selectedSubject);
        console.error('Доступные предметы:', subjects);
        setError('Ошибка: предмет не найден');
        return;
      }
      
      const groupName = selectedGroupObj.name;
      console.log(`Загрузка посещаемости: группа=${groupName}, предмет=${selectedSubjectObj.name}, дата=${selectedDate}`);
      
      // Сохраняем текущую карту статусов перед запросом
      const currentStatusMap = new Map(studentStatusMap);
      
      const apiUrl = '/attendance/records';
      const params = {
        group_name: encodeURIComponent(groupName),
        discipline_id: selectedSubject,
        attendance_date: selectedDate
      };
      
      console.log('API запрос:', apiUrl);
      console.log('Параметры запроса:', params);
      
      const response = await api.get(apiUrl, { params });
      
      console.log('Полный ответ API:', response);
      console.log('Структура данных в ответе:', Object.keys(response.data));
      
      // Универсальная обработка ответа от сервера
      let attendanceRecords = [];
      
      // Проверяем разные возможные форматы данных в ответе
      if (response.data.records && Array.isArray(response.data.records)) {
        attendanceRecords = response.data.records;
        console.log('Получены записи из поля records:', attendanceRecords);
      } else if (response.data.students && Array.isArray(response.data.students)) {
        attendanceRecords = response.data.students;
        console.log('Получены записи из поля students:', attendanceRecords);
      } else {
        console.warn('Данные о посещаемости не найдены в ответе. Доступные поля:', Object.keys(response.data));
        // Устанавливаем флаг, что данные загружены хотя бы один раз
        setInitialDataLoaded(true);
        if (showLoading) {
          setIsLoading(false);
        }
        return;
      }
      
      // Обновляем только те статусы, которые пришли с сервера
      // Для остальных студентов сохраняем текущий статус
      const newStatusMap = new Map(currentStatusMap);
      
      attendanceRecords.forEach((record: AttendanceServerRecord) => {
        if (!record.student_id) {
          console.warn('Запись посещаемости без ID студента:', record);
          return;
        }
        
        const studentId = record.student_id;
        const status = record.status;
        console.log(`Обновление статуса студента ${studentId}: ${status}`);
        newStatusMap.set(studentId, status);
      });
      
      if (newStatusMap.size > 0) {
        console.log('Обновленная карта статусов:', Object.fromEntries(newStatusMap));
        setStudentStatusMap(newStatusMap);
        
        // Обновляем статусы в списке студентов
        setStudents(prevStudents => 
          prevStudents.map(student => {
            // Если есть статус в новой карте - используем его
            if (newStatusMap.has(student.id)) {
              return { ...student, status: newStatusMap.get(student.id) };
            }
            // Иначе сохраняем текущий статус
            return student;
          })
        );
        
        // Обновляем записи о посещаемости
        const attendanceData = attendanceRecords
          .filter((record: AttendanceServerRecord) => record.student_id) // Фильтруем записи без ID
          .map((record: AttendanceServerRecord) => ({
            studentId: record.student_id,
            status: record.status
          }));
        
        setAttendanceRecords(attendanceData);
        console.log('Обновлены записи о посещаемости:', attendanceData);
      } else {
        console.warn('Не найдено данных для обновления статусов студентов');
      }
      
      // Устанавливаем флаг, что данные загружены хотя бы один раз
      setInitialDataLoaded(true);
      
    } catch (error: any) {
      console.error('Ошибка при загрузке данных о посещаемости:', error);
      
      if (error.response) {
        console.error('Данные ответа:', error.response.data);
        console.error('Статус ответа:', error.response.status);
        console.error('Заголовки ответа:', error.response.headers);
        
        if (error.response.status === 404) {
          setError('Данные о посещаемости не найдены для выбранных параметров');
        } else {
          setError(`Ошибка сервера: ${error.response.status} - ${error.response.data?.detail || 'Неизвестная ошибка'}`);
        }
      } else {
        setError('Ошибка при загрузке данных о посещаемости');
      }
    } finally {
      if (showLoading) {
        setIsLoading(false);
      }
    }
  };

  // Загрузка посещаемости при выборе даты, группы и предмета
  useEffect(() => {
    if (selectedGroup && selectedSubject && selectedDate && students.length > 0) {
      console.log(`Запускаем обновление данных посещаемости на основе изменений параметров:
        - Группа: ${selectedGroup}
        - Предмет: ${selectedSubject}
        - Дата: ${selectedDate}
        - Кол-во студентов: ${students.length}
      `);
      fetchAttendance(true);
    } else {
      console.log(`Не удается запустить обновление посещаемости. Проверьте параметры:
        - Группа: ${selectedGroup || 'не выбрана'}
        - Предмет: ${selectedSubject || 'не выбран'}
        - Дата: ${selectedDate || 'не выбрана'}
        - Кол-во студентов: ${students.length}
      `);
    }
  }, [selectedGroup, selectedSubject, selectedDate, students.length]);

  // Настройка автоматического обновления
  useEffect(() => {
    if (autoRefreshRef.current) {
      clearInterval(autoRefreshRef.current);
      autoRefreshRef.current = null;
    }

    if (selectedGroup && selectedSubject && selectedDate && initialDataLoaded) {
      console.log('Настройка интервала автообновления');
      
      autoRefreshRef.current = setInterval(() => {
        console.log(`[${new Date().toLocaleTimeString()}] Автоматическое обновление данных посещаемости...`);
        fetchAttendance(false);
      }, 3000);
    }

    return () => {
      if (autoRefreshRef.current) {
        clearInterval(autoRefreshRef.current);
      }
    };
  }, [selectedGroup, selectedSubject, selectedDate, initialDataLoaded, fetchAttendance]);

  // Обработчики изменения выбранных значений
  const handleGroupChange = (event: SelectChangeEvent) => {
    setSelectedGroup(event.target.value);
  };

  const handleSubjectChange = (event: SelectChangeEvent) => {
    console.log(`Изменение выбранного предмета на: ${event.target.value}`);
    setSelectedSubject(event.target.value);
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedDate(event.target.value);
  };

  // Обработчик изменения статуса студента
  const handleStatusChange = (studentId: string, newStatus: string) => {
    console.log(`Изменение статуса студента ${studentId}: ${newStatus}`);
    
    // Обновляем карту статусов
    const updatedMap = new Map(studentStatusMap);
    updatedMap.set(studentId, newStatus);
    setStudentStatusMap(updatedMap);
    
    // Обновляем список студентов
    setStudents(prevStudents => 
      prevStudents.map(student => 
        student.id === studentId ? { ...student, status: newStatus } : student
      )
    );
    
    // Обновляем записи о посещаемости
    const existingRecordIndex = attendanceRecords.findIndex(record => record.studentId === studentId);
    
    if (existingRecordIndex !== -1) {
      setAttendanceRecords(prevRecords => {
        const updatedRecords = [...prevRecords];
        updatedRecords[existingRecordIndex] = { ...updatedRecords[existingRecordIndex], status: newStatus };
        return updatedRecords;
      });
    } else {
      setAttendanceRecords(prevRecords => [...prevRecords, { studentId, status: newStatus }]);
    }
    
    // Автоматически сохраняем изменения на сервере
    saveAttendanceStatus(studentId, newStatus);
  };

  // Функция для сохранения статуса посещаемости одного студента
  const saveAttendanceStatus = async (studentId: string, status: string) => {
    if (!selectedSubject || !selectedDate) {
      console.error('Невозможно сохранить статус: не выбраны предмет или дата');
      setError('Выберите предмет и дату');
      return;
    }
    
    try {
      console.log(`Сохранение статуса для студента ${studentId}: ${status}`);
      
      const record = {
        student_id: studentId,
        discipline_id: selectedSubject,
        date: selectedDate,
        status: status
      };
      
      // Отправляем запрос на сервер для сохранения статуса
      await api.post('/attendance/update', [record]);
      console.log('Статус успешно сохранен на сервере');
      
      // Показываем кратковременное уведомление об успехе
      setSuccess('Статус студента обновлен');
      
      // Скрываем уведомление через 2 секунды
      setTimeout(() => {
        setSuccess(null);
      }, 2000);
      
    } catch (error: any) {
      console.error('Ошибка при сохранении статуса:', error);
      
      if (error.response) {
        console.error('Данные ответа:', error.response.data);
        console.error('Статус ответа:', error.response.status);
      }
      
      setError('Не удалось сохранить статус студента');
    }
  };

  // Сохранение данных о посещаемости
  const handleSaveAttendance = async () => {
    if (!selectedGroup || !selectedSubject || !selectedDate) {
      setError('Выберите группу, предмет и дату');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Создаем массив записей на основе актуальных статусов из карты
      const recordsToSave = Array.from(studentStatusMap.entries())
        .map(([studentId, status]) => ({
          student_id: studentId,
          discipline_id: selectedSubject,
          date: selectedDate,
          status: status
        }));
      
      console.log('Отправляем данные о посещаемости:', recordsToSave);
      
      await api.post('/attendance/update', recordsToSave);
      
      setSuccess('Данные о посещаемости сохранены');
      
      // Обновляем данные с сервера
      fetchAttendance(false);
    } catch (error: any) {
      console.error('Ошибка при сохранении данных о посещаемости:', error);
      
      if (error.response) {
        console.error('Данные ответа:', error.response.data);
        console.error('Статус ответа:', error.response.status);
      }
      
      setError('Ошибка при сохранении данных');
    } finally {
      setIsLoading(false);
    }
  };

  // Генерация QR-кода
  const handleGenerateQR = () => {
    if (!selectedGroup || !selectedSubject || !selectedDate) {
      setError('Выберите группу, предмет и дату');
      return;
    }
    
    const selectedGroupObj = groups.find(g => g.id === selectedGroup);
    if (!selectedGroupObj) {
      console.error('Группа не найдена по ID:', selectedGroup);
      setError('Ошибка: группа не найдена');
      return;
    }
    
    const qrData = {
      groupId: selectedGroup,
      groupName: selectedGroupObj.name,
      subjectId: selectedSubject,
      date: selectedDate,
      timestamp: new Date().getTime()
    };
    
    console.log('Создаем QR-код с данными:', qrData);
    
    const qrString = JSON.stringify(qrData);
    setQrValue(qrString);
    setOpenQRDialog(true);
  };

  // Обновление данных вручную
  const handleRefresh = () => {
    fetchAttendance(true);
  };

  // Удаление записи о посещаемости
  const handleDeleteAttendance = async (studentId: string) => {
    try {
      console.log('Начало удаления записи посещаемости:', { studentId, selectedSubject, selectedDate });
      
      if (!selectedSubject || !selectedDate) {
        console.error('Необходимы параметры дисциплины и даты для удаления');
        setError('Выберите дисциплину и дату');
        return;
      }
    
      const studentInfo = students.find(student => student.id === studentId);
      
      console.log('Информация о студенте:', studentInfo);
      console.log('Текущий статус студента:', studentStatusMap.get(studentId));
      
      if (studentInfo) {
        Swal.fire({
          title: 'Подтверждение',
          html: `<div>
                   <p>Вы уверены, что хотите удалить запись о посещении для студента <b>${studentInfo.fullName}</b>?</p>
                   <p>ID студента: <code>${studentId}</code></p>
                   <p>ID дисциплины: <code>${selectedSubject}</code></p>
                   <p>Дата: <code>${selectedDate}</code></p>
                 </div>`,
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#3085d6',
          cancelButtonColor: '#d33',
          confirmButtonText: 'Да, удалить',
          cancelButtonText: 'Отмена',
        }).then((result: { isConfirmed: boolean }) => {
          if (result.isConfirmed) {
            confirmDelete(studentId);
          }
        });
      }
    } catch (error: any) {
      console.error('Ошибка при обработке удаления:', error);
      setError('Не удалось выполнить операцию удаления');
    }
  };

  // Новая функция для отладки записей посещаемости
  const debugAttendanceDetails = async (studentId: string) => {
    setIsLoading(true);
    
    try {
      console.log(`Проверка записей посещаемости для студента: ${studentId}, дисциплина: ${selectedSubject}, дата: ${selectedDate}`);
      
      if (!selectedSubject || !selectedDate) {
        console.error('Необходимо выбрать дисциплину и дату для проверки записей');
        return;
      }
      
      const response = await api.get(`/attendance/debug-attendance?student_id=${studentId}&discipline_id=${selectedSubject}&attendance_date=${selectedDate}`);
      console.log('Полученные записи:', response.data);
      
      if (response.data && response.data.student_records > 0) {
        Swal.fire({
          title: 'Информация о записях посещаемости',
          html: (
            <div style={{ maxHeight: '400px', overflow: 'auto' }}>
              <p>Всего записей в базе: {response.data.total_records}</p>
              <p>Записей для выбранного студента: {response.data.student_records}</p>
              <h4>Детали записей:</h4>
              {response.data.records.map((record: any, index: number) => (
                <div key={index} style={{ marginBottom: '16px', padding: '8px', border: '1px solid #eee' }}>
                  <p>ID записи: {record._id}</p>
                  <p>ID студента: {record.studentId}</p>
                  <p>ID дисциплины: {record.discipline_id}</p>
                  <p>Дата: {record.date}</p>
                  <p>Статус: {record.status}</p>
                  <p>Создано: {record.created_at}</p>
                </div>
              ))}
            </div>
          ),
          width: 600,
        });
      } else {
        Swal.fire({
          title: 'Информация о записях посещаемости',
          text: 'Записи о посещаемости для данного студента не найдены',
          icon: 'info',
        });
      }
    } catch (error) {
      console.error('Ошибка при получении записей о посещаемости:', error);
      Swal.fire({
        title: 'Ошибка',
        text: 'Не удалось получить информацию о записях посещаемости',
        icon: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Подтверждение удаления
  const confirmDelete = async (studentId: string) => {
    try {
      setIsLoading(true);
      console.log(`Удаление записи посещаемости: Студент=${studentId}, Дисциплина=${selectedSubject}, Дата=${selectedDate}`);
      
      const params = new URLSearchParams({
        student_id: studentId,
        discipline_id: selectedSubject,
        attendance_date: selectedDate,
      });
      
      console.log(`Отправляем запрос на удаление с параметрами: ${params.toString()}`);
      
      try {
        // Сначала проверим, существует ли запись
        const debugResponse = await api.get(`/attendance/debug-attendance`, {
          params: {
            student_id: studentId,
            discipline_id: selectedSubject,
            attendance_date: selectedDate
          }
        });
        
        console.log('Результат проверки перед удалением:', debugResponse.data);
        
        if (!debugResponse.data.student_records || debugResponse.data.student_records === 0) {
          console.warn('Записи посещаемости не найдены в базе данных перед удалением!');
          Swal.fire({
            title: 'Внимание',
            text: 'Записи посещаемости не найдены в базе данных. Возможно, они уже были удалены.',
            icon: 'warning'
          });
          
          // Обновляем карту статусов
          const updatedMap = new Map(studentStatusMap);
          updatedMap.set(studentId, 'Н');
          setStudentStatusMap(updatedMap);
          
          // Обновляем список студентов
          setStudents(prevStudents => 
            prevStudents.map(student => 
              student.id === studentId ? { ...student, status: 'Н' } : student
            )
          );
          
          // Удаляем запись из списка записей
          setAttendanceRecords(prevRecords => 
            prevRecords.filter(record => record.studentId !== studentId)
          );
          
          setSuccess('Студент отмечен как отсутствующий');
          setIsLoading(false);
          return;
        }
        
        const response = await api.delete(`/attendance/delete-attendance?${params.toString()}`);
        console.log('Ответ сервера при удалении:', response.data);
        
        if (response.data.success) {
          // Обновляем карту статусов
          const updatedMap = new Map(studentStatusMap);
          updatedMap.set(studentId, 'Н');
          setStudentStatusMap(updatedMap);
          
          // Обновляем список студентов
          setStudents(prevStudents => 
            prevStudents.map(student => 
              student.id === studentId ? { ...student, status: 'Н' } : student
            )
          );
          
          // Удаляем запись из списка записей
          setAttendanceRecords(prevRecords => 
            prevRecords.filter(record => record.studentId !== studentId)
          );
          
          setSuccess('Запись о посещаемости успешно удалена');
          
          // Проверим, действительно ли запись удалена
          setTimeout(async () => {
            try {
              const verifyResponse = await api.get(`/attendance/debug-attendance`, {
                params: {
                  student_id: studentId,
                  discipline_id: selectedSubject,
                  attendance_date: selectedDate
                }
              });
              
              console.log('Проверка после удаления:', verifyResponse.data);
              
              if (verifyResponse.data.student_records && verifyResponse.data.student_records > 0) {
                console.warn('Запись все еще существует после удаления!');
                Swal.fire({
                  title: 'Предупреждение',
                  text: 'Система сообщила об успешном удалении, но запись все еще существует. Пожалуйста, обратитесь к администратору.',
                  icon: 'warning'
                });
              }
            } catch (verifyError) {
              console.error('Ошибка при проверке удаления:', verifyError);
            }
          }, 1000);
        } else {
          console.error('Ошибка при удалении записи:', response.data.message);
          setError(`Не удалось удалить запись: ${response.data.message}`);
          
          // Отображаем более детальную информацию
          Swal.fire({
            title: 'Ошибка при удалении',
            html: `<div>
                    <p>Не удалось удалить запись о посещаемости:</p>
                    <pre>${JSON.stringify(response.data, null, 2)}</pre>
                  </div>`,
            icon: 'error'
          });
          
          // Обновляем данные с сервера
          fetchAttendance(false);
        }
      } catch (apiError: any) {
        console.error('Ошибка API при удалении записи:', apiError);
        
        if (apiError.response) {
          console.error('Данные ответа:', apiError.response.data);
          console.error('Статус ответа:', apiError.response.status);
        }
        
        const errorMessage = apiError.response?.data?.detail || apiError.message || 'Неизвестная ошибка';
        setError(`Ошибка при удалении записи: ${errorMessage}`);
        
        // Отображаем более детальную информацию
        Swal.fire({
          title: 'Ошибка при удалении',
          html: `<div>
                  <p>Произошла ошибка при удалении записи о посещаемости:</p>
                  <pre>${errorMessage}</pre>
                  <p>Проверьте консоль браузера для получения дополнительной информации.</p>
                </div>`,
          icon: 'error'
        });
        
        // Обновляем данные с сервера
        fetchAttendance(false);
      }
    } catch (error: any) {
      console.error('Общая ошибка при удалении записи о посещаемости:', error);
      
      const errorMessage = error.message || 'Неизвестная ошибка';
      setError(`Ошибка при удалении записи: ${errorMessage}`);
      
      // Обновляем данные с сервера
      fetchAttendance(false);
    } finally {
      setIsLoading(false);
    }
  };

  const cancelDelete = () => {
    setIsLoading(false);
    setStudentToDelete(null);
  };

  // Визуализация статуса студента, используя значение из карты статусов для стабильности
  const renderStudentStatus = (studentId: string) => {
    const status = studentStatusMap.get(studentId) || 'Н';
    
    let statusText, statusColor;
    switch(status) {
      case 'П':
        statusText = 'Присутствует';
        statusColor = 'success.main';
        break;
      case 'Н':
        statusText = 'Отсутствует';
        statusColor = 'error.main';
        break;
      case 'Б':
        statusText = 'Болеет';
        statusColor = 'warning.main';
        break;
      default:
        statusText = 'Неизвестно';
        statusColor = 'text.secondary';
    }
    
    return (
      <Tooltip title={statusText}>
        <Box
          sx={{
            display: 'inline-block',
            fontWeight: 'bold',
            color: statusColor,
            padding: '4px 8px',
            borderRadius: '4px',
            backgroundColor: (theme) => 
              status === 'П' ? theme.palette.success.light + '20' : 
              status === 'Н' ? theme.palette.error.light + '20' : 
              status === 'Б' ? theme.palette.warning.light + '20' : 
              'transparent'
          }}
        >
          {status}
        </Box>
      </Tooltip>
    );
  };

  // Функция для определения иконки статуса
  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'П':
        return <CheckCircleOutline color="success" />;
      case 'Н':
        return <RadioButtonUnchecked color="error" />;
      case 'Б':
        return <LocalHospital sx={{ color: "#ED6C02", fontSize: '1.2rem' }} />;
      default:
        return <QuestionMark fontSize="small" />;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Учет посещаемости
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
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
          
          <Grid item xs={12} md={2}>
            <FormControl fullWidth>
              <InputLabel htmlFor="date-input" shrink>
                Дата
              </InputLabel>
              <Box sx={{ pt: 2 }}>
                <input
                  type="date"
                  id="date-input"
                  value={selectedDate}
                  onChange={handleDateChange}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: '4px',
                    border: '1px solid #ccc'
                  }}
                />
              </Box>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              disabled={!selectedGroup || !selectedSubject || isLoading}
              onClick={handleGenerateQR}
              startIcon={<QrCode2 />}
            >
              QR-код
            </Button>
          </Grid>
          
          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              color="info"
              fullWidth
              disabled={!selectedGroup || !selectedSubject || isLoading}
              onClick={handleRefresh}
            >
              Обновить
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          {students.length > 0 ? (
            <>
              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                Найдено студентов: {students.length}. 
                Присутствуют: {Array.from(studentStatusMap.values()).filter(status => status === 'П').length}.
                Отсутствуют: {Array.from(studentStatusMap.values()).filter(status => status === 'Н').length}.
              </Typography>
              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>№</TableCell>
                      <TableCell>ФИО студента</TableCell>
                      <TableCell align="center">Статус</TableCell>
                      <TableCell align="center">Действия</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {students.map((student, index) => {
                      const studentStatus = studentStatusMap.get(student.id) || 'Н';
                      return (
                        <TableRow 
                          key={student.id}
                          sx={{
                            backgroundColor: 
                              studentStatus === 'П' ? 'rgba(0, 200, 0, 0.05)' : 
                              studentStatus === 'Н' ? 'rgba(255, 0, 0, 0.05)' : 
                              'transparent'
                          }}
                        >
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{student.fullName}</TableCell>
                          <TableCell align="center">
                            {renderStudentStatus(student.id)}
                          </TableCell>
                          <TableCell align="center">
                            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                              <Tooltip title={studentStatus === 'Н' ? 'Отметить присутствие' : 'Отметить отсутствие'}>
                                <IconButton 
                                  color={studentStatus === 'Н' ? 'success' : 'error'} 
                                  onClick={() => handleStatusChange(student.id, studentStatus === 'Н' ? 'П' : 'Н')}
                                  disabled={isLoading}
                                >
                                  {studentStatus === 'Н' ? <CheckCircleOutline /> : <RadioButtonUnchecked />}
                                </IconButton>
                              </Tooltip>
                              
                              {studentStatus !== 'Н' && (
                                <>
                                  <Tooltip title="Просмотреть техническую информацию о записи">
                                    <IconButton
                                      color="info"
                                      onClick={() => debugAttendanceDetails(student.id)}
                                      disabled={isLoading || loadingStudents[student.id]}
                                      size="small"
                                    >
                                      {loadingStudents[student.id] ? (
                                        <CircularProgress size={24} />
                                      ) : (
                                        <Visibility />
                                      )}
                                    </IconButton>
                                  </Tooltip>
                                  
                                  <Tooltip title="Удалить запись о присутствии">
                                    <IconButton
                                      color="error"
                                      onClick={() => handleDeleteAttendance(student.id)}
                                      disabled={isLoading}
                                    >
                                      <DeleteOutline />
                                    </IconButton>
                                  </Tooltip>
                                </>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          ) : selectedGroup ? (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography>Нет данных о студентах для выбранной группы</Typography>
            </Paper>
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography>Выберите группу, предмет и дату для отображения списка студентов</Typography>
            </Paper>
          )}
          
          {students.length > 0 && (
            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSaveAttendance}
                disabled={isLoading}
              >
                {isLoading ? <CircularProgress size={24} /> : 'Сохранить все'}
              </Button>
            </Box>
          )}
        </>
      )}
      
      {/* Диалог с QR-кодом */}
      <Dialog
        open={openQRDialog}
        onClose={() => setOpenQRDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogContent>
          <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
            <IconButton onClick={() => setOpenQRDialog(false)}>
              <Close />
            </IconButton>
          </Box>
          
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '60vh'
          }}>
            <Typography variant="h6" gutterBottom>
              QR-код для отметки посещаемости
            </Typography>
            
            <Typography variant="body2" gutterBottom color="text.secondary">
              {groups.find(g => g.id === selectedGroup)?.name} | 
              {subjects.find(s => s.id === selectedSubject)?.name} | 
              {new Date(selectedDate).toLocaleDateString()}
            </Typography>
            
            <Box sx={{ 
              p: 2, 
              border: '1px solid #eee', 
              borderRadius: 2,
              backgroundColor: '#fff',
              mt: 2
            }}>
              <QRCodeCanvas 
                value={qrValue}
                size={256}
                level="H"
                includeMargin={true}
              />
            </Box>
            
            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center', color: 'text.secondary' }}>
              Покажите этот QR-код студентам или выведите его на экран для сканирования
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenQRDialog(false)}>Закрыть</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default TeacherAttendance; 