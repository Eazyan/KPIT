import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { 
  Box, 
  Container, 
  Typography, 
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  Avatar,
  Chip,
  Stack
} from '@mui/material';
import { 
  Dashboard,
  School,
  CalendarMonth,
  Assignment,
  Group,
  EventNote
} from '@mui/icons-material';
import { Layout } from '../components/Layout';
import { AuthContext } from '../context/AuthContext';
import { UserRole } from '../types';

const HomePage: React.FC = () => {
  const { user } = useContext(AuthContext);
  
  // Функция для отображения приветствия в зависимости от времени суток
  const getGreeting = (): string => {
    const hour = new Date().getHours();
    
    if (hour < 6) return 'Доброй ночи';
    if (hour < 12) return 'Доброе утро';
    if (hour < 18) return 'Добрый день';
    return 'Добрый вечер';
  };
  
  return (
    <Layout>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={600} gutterBottom>
          {getGreeting()}{user ? ', ' + user.name : ''}!
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" gutterBottom>
          Добро пожаловать в систему контроля посещаемости и успеваемости студентов ДВФУ
        </Typography>
      </Box>
      
      {user ? (
        <>
          {/* Карточки для студента */}
          {user.role === UserRole.STUDENT && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card 
                  elevation={0}
                  sx={{ 
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 4,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6" fontWeight={600}>
                        Предстоящие занятия
                      </Typography>
                      <Button 
                        component={Link} 
                        to="/schedule"
                        variant="outlined" 
                        size="small"
                        sx={{ borderRadius: 2 }}
                      >
                        Всё расписание
                      </Button>
                    </Box>
                    
                    <Stack spacing={2}>
                      {[
                        { 
                          subject: 'Программирование', 
                          type: 'Лекция', 
                          time: '10:00 - 11:30', 
                          teacher: 'Иванов И.И.', 
                          room: 'G317'
                        },
                        { 
                          subject: 'Базы данных', 
                          type: 'Практика', 
                          time: '12:00 - 13:30', 
                          teacher: 'Петров П.П.', 
                          room: 'G223'
                        },
                      ].map((lesson, index) => (
                        <Paper 
                          key={index}
                          elevation={0}
                          sx={{ 
                            p: 2, 
                            borderRadius: 3,
                            border: '1px solid rgba(0, 0, 0, 0.06)',
                            background: 'rgba(255, 255, 255, 0.5)',
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {lesson.subject}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {lesson.teacher}, ауд. {lesson.room}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Chip 
                                label={lesson.type} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                                sx={{ fontWeight: 500, mb: 1 }}
                              />
                              <Typography variant="body2" color="text.secondary">
                                {lesson.time}
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Stack spacing={3} sx={{ height: '100%' }}>
                  <Card 
                    elevation={0}
                    sx={{ 
                      background: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 4,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Dashboard color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" fontWeight={600}>
                          Успеваемость
                        </Typography>
                      </Box>
                      
                      <Typography variant="h3" fontWeight={600} color="primary" align="center" sx={{ mb: 2 }}>
                        82%
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
                        Текущий средний балл по всем дисциплинам
                      </Typography>
                      
                      <Button 
                        component={Link} 
                        to="/grades"
                        variant="outlined" 
                        fullWidth
                        sx={{ borderRadius: 2 }}
                      >
                        Подробнее
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    elevation={0}
                    sx={{ 
                      background: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 4,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CalendarMonth color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" fontWeight={600}>
                          Посещаемость
                        </Typography>
                      </Box>
                      
                      <Typography variant="h3" fontWeight={600} color="primary" align="center" sx={{ mb: 2 }}>
                        94%
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
                        Процент посещаемости за текущий семестр
                      </Typography>
                      
                      {user && user.role === UserRole.STUDENT ? (
                        <Button 
                          component={Link} 
                          to="/attendance/scan"
                          variant="outlined" 
                          fullWidth
                          sx={{ borderRadius: 2 }}
                        >
                          Сканировать QR-код
                        </Button>
                      ) : (
                        <Button 
                          component={Link} 
                          to="/attendance/teacher"
                          variant="outlined" 
                          fullWidth
                          sx={{ borderRadius: 2 }}
                        >
                          Учет посещаемости
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>
            </Grid>
          )}
          
          {/* Карточки для преподавателя */}
          {(user.role === UserRole.TEACHER || user.role === UserRole.HEAD_OF_DEPARTMENT) && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card 
                  elevation={0}
                  sx={{ 
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 4,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6" fontWeight={600}>
                        Расписание занятий на сегодня
                      </Typography>
                      <Button 
                        component={Link} 
                        to="/schedule"
                        variant="outlined" 
                        size="small"
                        sx={{ borderRadius: 2 }}
                      >
                        Полное расписание
                      </Button>
                    </Box>
                    
                    <Stack spacing={2}>
                      {[
                        { 
                          subject: 'Программирование', 
                          type: 'Лекция', 
                          time: '10:00 - 11:30', 
                          group: 'Б8120-09.03.03пикд', 
                          room: 'G317'
                        },
                        { 
                          subject: 'Базы данных', 
                          type: 'Практика', 
                          time: '12:00 - 13:30', 
                          group: 'Б8119-09.03.03пикд', 
                          room: 'G223'
                        },
                      ].map((lesson, index) => (
                        <Paper 
                          key={index}
                          elevation={0}
                          sx={{ 
                            p: 2, 
                            borderRadius: 3,
                            border: '1px solid rgba(0, 0, 0, 0.06)',
                            background: 'rgba(255, 255, 255, 0.5)',
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={600}>
                                {lesson.subject}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {lesson.group}, ауд. {lesson.room}
                              </Typography>
                            </Box>
                            <Box sx={{ textAlign: 'right' }}>
                              <Chip 
                                label={lesson.type} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                                sx={{ fontWeight: 500, mb: 1 }}
                              />
                              <Typography variant="body2" color="text.secondary">
                                {lesson.time}
                              </Typography>
                            </Box>
                          </Box>
                        </Paper>
                      ))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Stack spacing={3} sx={{ height: '100%' }}>
                  <Card 
                    elevation={0}
                    sx={{ 
                      background: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 4,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Group color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" fontWeight={600}>
                          Мои группы
                        </Typography>
                      </Box>
                      
                      <Stack spacing={1} sx={{ mb: 2 }}>
                        {['Б8120-09.03.03пикд', 'Б8119-09.03.03пикд', 'Б8121-09.03.03пикд'].map((group, index) => (
                          <Chip 
                            key={index}
                            label={group} 
                            variant="outlined"
                            clickable
                            component={Link}
                            to={`/groups/${group}`}
                            sx={{ fontWeight: 500 }}
                          />
                        ))}
                      </Stack>
                      
                      <Button 
                        component={Link} 
                        to="/groups"
                        variant="outlined" 
                        fullWidth
                        sx={{ borderRadius: 2 }}
                      >
                        Все группы
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    elevation={0}
                    sx={{ 
                      background: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 4,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <School color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" fontWeight={600}>
                          Мои дисциплины
                        </Typography>
                      </Box>
                      
                      <Stack spacing={1} sx={{ mb: 2 }}>
                        {['Программирование', 'Базы данных', 'Веб-технологии'].map((discipline, index) => (
                          <Chip 
                            key={index}
                            label={discipline} 
                            variant="outlined"
                            clickable
                            component={Link}
                            to={`/disciplines/${index + 1}`}
                            sx={{ fontWeight: 500 }}
                          />
                        ))}
                      </Stack>
                      
                      <Button 
                        component={Link} 
                        to="/disciplines"
                        variant="outlined" 
                        fullWidth
                        sx={{ borderRadius: 2 }}
                      >
                        Все дисциплины
                      </Button>
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>
            </Grid>
          )}
          
          {/* Карточки для администратора */}
          {user.role === UserRole.ADMIN && (
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card 
                  elevation={0}
                  sx={{ 
                    height: '100%',
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: 4,
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                >
                  <CardContent sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                      <Typography variant="h6" fontWeight={600}>
                        Статистика системы
                      </Typography>
                      <Button 
                        component={Link} 
                        to="/admin/dashboard"
                        variant="outlined" 
                        size="small"
                        sx={{ borderRadius: 2 }}
                      >
                        Панель управления
                      </Button>
                    </Box>
                    
                    <Grid container spacing={3}>
                      {[
                        { title: 'Пользователей', count: 3254, icon: <Group color="primary" /> },
                        { title: 'Учебных групп', count: 142, icon: <School color="primary" /> },
                        { title: 'Дисциплин', count: 567, icon: <School color="primary" /> },
                        { title: 'Занятий (неделя)', count: 1230, icon: <EventNote color="primary" /> },
                      ].map((stat, index) => (
                        <Grid item xs={6} sm={3} key={index}>
                          <Paper
                            elevation={0}
                            sx={{ 
                              p: 2, 
                              borderRadius: 3,
                              border: '1px solid rgba(0, 0, 0, 0.06)',
                              background: 'rgba(255, 255, 255, 0.5)',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {stat.icon}
                            <Typography variant="h5" fontWeight={600} sx={{ mt: 1 }}>
                              {stat.count}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" align="center">
                              {stat.title}
                            </Typography>
                          </Paper>
                        </Grid>
                      ))}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Stack spacing={3} sx={{ height: '100%' }}>
                  <Card 
                    elevation={0}
                    sx={{ 
                      background: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 4,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Dashboard color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" fontWeight={600}>
                          Активность системы
                        </Typography>
                      </Box>
                      
                      <Typography variant="h3" fontWeight={600} color="primary" align="center" sx={{ mb: 1 }}>
                        87%
                      </Typography>
                      
                      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2 }}>
                        Рост активности пользователей за последний месяц
                      </Typography>
                      
                      <Button 
                        component={Link} 
                        to="/admin/analytics"
                        variant="outlined" 
                        fullWidth
                        sx={{ borderRadius: 2 }}
                      >
                        Подробная аналитика
                      </Button>
                    </CardContent>
                  </Card>
                  
                  <Card 
                    elevation={0}
                    sx={{ 
                      background: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(20px)',
                      borderRadius: 4,
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Assignment color="primary" sx={{ mr: 1 }} />
                        <Typography variant="h6" fontWeight={600}>
                          Системные уведомления
                        </Typography>
                      </Box>
                      
                      <Stack spacing={2}>
                        {[
                          { text: 'Обновление системы запланировано на 15 мая 2024', time: '2 часа назад' },
                          { text: '5 новых пользователей ожидают подтверждения', time: '6 часов назад' },
                        ].map((notification, index) => (
                          <Box key={index} sx={{ borderBottom: '1px solid rgba(0, 0, 0, 0.05)', pb: 1 }}>
                            <Typography variant="body2">
                              {notification.text}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {notification.time}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>
            </Grid>
          )}
        </>
      ) : (
        // Для неавторизованных пользователей
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <Card 
              elevation={0}
              sx={{ 
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                borderRadius: 4,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardContent sx={{ p: 4, width: '100%' }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 2,
                    color: 'primary.main',
                  }}
                >
                  <School sx={{ fontSize: 50, mr: 2 }} />
                  <Typography variant="h5" fontWeight={600}>
                    Для студентов
                  </Typography>
                </Box>
                
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Следите за своей успеваемостью и посещаемостью, просматривайте расписание занятий и актуальные оценки по всем предметам.
                </Typography>
                
                <Button 
                  variant="contained" 
                  color="primary"
                  sx={{ mt: 2, borderRadius: 2, px: 4 }}
                >
                  Войти как студент
                </Button>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Card 
              elevation={0}
              sx={{ 
                background: 'rgba(255, 255, 255, 0.7)',
                backdropFilter: 'blur(20px)',
                borderRadius: 4,
                border: '1px solid rgba(255, 255, 255, 0.2)',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <CardContent sx={{ p: 4, width: '100%' }}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 2,
                    color: 'secondary.main',
                  }}
                >
                  <Assignment sx={{ fontSize: 50, mr: 2 }} />
                  <Typography variant="h5" fontWeight={600}>
                    Для преподавателей
                  </Typography>
                </Box>
                
                <Typography variant="body1" sx={{ mb: 2 }}>
                  Управляйте учебным процессом, отмечайте посещаемость, выставляйте оценки и анализируйте успеваемость ваших студентов.
                </Typography>
                
                <Button 
                  variant="contained" 
                  color="secondary"
                  sx={{ mt: 2, borderRadius: 2, px: 4 }}
                >
                  Войти как преподаватель
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Layout>
  );
};

export default HomePage; 