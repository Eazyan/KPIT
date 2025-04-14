import React, { useContext } from 'react';
import { 
  Drawer, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Divider, 
  Box, 
  useTheme,
  Typography
} from '@mui/material';
import {
  Home,
  Dashboard,
  School,
  Group,
  AssignmentTurnedIn,
  EventNote,
  Assessment,
  Settings,
  Person
} from '@mui/icons-material';
import { Link, useLocation } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import { UserRole } from '../../types';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  drawerWidth?: number;
  variant?: 'permanent' | 'persistent' | 'temporary';
}

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  open, 
  onClose, 
  drawerWidth = 240,
  variant = 'temporary'
}) => {
  const { user } = useContext(AuthContext);
  const location = useLocation();
  const theme = useTheme();
  
  // Общие элементы меню
  const commonMenuItems: MenuItem[] = [
    { text: 'Главная', icon: <Home />, path: '/' },
    { text: 'Профиль', icon: <Person />, path: '/profile' },
  ];
  
  // Элементы меню для студента
  const studentMenuItems: MenuItem[] = [
    { text: 'Моя успеваемость', icon: <Assessment />, path: '/grades' },
    { text: 'Моя посещаемость', icon: <EventNote />, path: '/attendance' },
    { text: 'Расписание', icon: <EventNote />, path: '/schedule' },
  ];
  
  // Элементы меню для преподавателя
  const teacherMenuItems: MenuItem[] = [
    { text: 'Мои дисциплины', icon: <School />, path: '/disciplines' },
    { text: 'Контроль посещаемости', icon: <EventNote />, path: '/attendance-control' },
    { text: 'Контроль успеваемости', icon: <AssignmentTurnedIn />, path: '/grades-control' },
    { text: 'Отчеты', icon: <Assessment />, path: '/reports' },
  ];
  
  // Элементы меню для администратора
  const adminMenuItems: MenuItem[] = [
    { text: 'Панель администратора', icon: <Dashboard />, path: '/admin/dashboard' },
    { text: 'Управление пользователями', icon: <Group />, path: '/admin/users' },
    { text: 'Управление группами', icon: <Group />, path: '/admin/groups' },
    { text: 'Управление дисциплинами', icon: <School />, path: '/admin/disciplines' },
    { text: 'Настройки системы', icon: <Settings />, path: '/admin/settings' },
  ];
  
  // Определение активных пунктов меню на основе роли пользователя
  let roleSpecificItems: MenuItem[] = [];
  let roleTitle = '';
  
  if (user) {
    if (user.role === UserRole.STUDENT) {
      roleSpecificItems = studentMenuItems;
      roleTitle = 'Студент';
    } else if (user.role === UserRole.TEACHER) {
      roleSpecificItems = teacherMenuItems;
      roleTitle = 'Преподаватель';
    } else if (user.role === UserRole.ADMIN) {
      roleSpecificItems = adminMenuItems;
      roleTitle = 'Администратор';
    }
  }
  
  // Контент боковой панели
  const drawerContent = (
    <Box sx={{ width: drawerWidth }}>
      <Box 
        sx={{ 
          py: 2, 
          px: 2,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <School color="primary" sx={{ mr: 1 }} />
        <Typography variant="subtitle1" fontWeight={600}>
          КПиУС ДВФУ
        </Typography>
      </Box>
      
      <Divider />
      
      {user && (
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            {roleTitle}
          </Typography>
          <Typography variant="body1" fontWeight={500}>
            {user.name}
          </Typography>
          {user.group && (
            <Typography variant="body2" color="text.secondary">
              Группа: {user.group}
            </Typography>
          )}
          {user.department && (
            <Typography variant="body2" color="text.secondary">
              Кафедра: {user.department}
            </Typography>
          )}
        </Box>
      )}
      
      <Divider />
      
      <List component="nav">
        {commonMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              onClick={onClose}
              sx={{
                borderRadius: '0 24px 24px 0',
                mr: 1,
                '&.Mui-selected': {
                  bgcolor: 'rgba(10, 132, 255, 0.08)',
                  '&:hover': {
                    bgcolor: 'rgba(10, 132, 255, 0.12)',
                  },
                },
              }}
            >
              <ListItemIcon 
                sx={{ 
                  color: location.pathname === item.path 
                    ? theme.palette.primary.main 
                    : theme.palette.text.secondary 
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      
      {user && roleSpecificItems.length > 0 && (
        <>
          <Divider sx={{ mt: 1, mb: 1 }} />
          
          <List component="nav">
            {roleSpecificItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  selected={location.pathname === item.path}
                  onClick={onClose}
                  sx={{
                    borderRadius: '0 24px 24px 0',
                    mr: 1,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(10, 132, 255, 0.08)',
                      '&:hover': {
                        bgcolor: 'rgba(10, 132, 255, 0.12)',
                      },
                    },
                  }}
                >
                  <ListItemIcon 
                    sx={{ 
                      color: location.pathname === item.path 
                        ? theme.palette.primary.main 
                        : theme.palette.text.secondary 
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );
  
  return (
    <>
      {/* Мобильная версия */}
      {variant === 'temporary' && (
        <Drawer
          variant="temporary"
          open={open}
          onClose={onClose}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid rgba(0, 0, 0, 0.08)',
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
      
      {/* Десктопная версия */}
      {variant === 'persistent' && (
        <Drawer
          variant="persistent"
          open={open}
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid rgba(0, 0, 0, 0.08)',
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
              transition: theme.transitions.create('transform', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              zIndex: theme.zIndex.appBar - 1,
            },
          }}
        >
          {drawerContent}
        </Drawer>
      )}
      
      {/* Фиксированная версия при необходимости */}
      {variant === 'permanent' && (
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': { 
              boxSizing: 'border-box', 
              width: drawerWidth,
              borderRight: '1px solid rgba(0, 0, 0, 0.08)',
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(20px)',
            },
          }}
          open
        >
          {drawerContent}
        </Drawer>
      )}
    </>
  );
};

export default Sidebar; 