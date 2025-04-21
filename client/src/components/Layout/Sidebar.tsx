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
  Typography,
  useMediaQuery
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
  Person,
  CalendarMonth,
  QrCode2,
  EventAvailable,
  HowToReg,
  Leaderboard
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
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Определяем доступные пункты меню в зависимости от роли пользователя
  const getMenuItems = (): MenuItem[] => {
    const commonItems: MenuItem[] = [
      {
        text: 'Главная',
        icon: <Dashboard />,
        path: '/',
      },
      {
        text: 'Расписание',
        icon: <CalendarMonth />,
        path: '/schedule',
      },
    ];
    
    const studentItems: MenuItem[] = [
      {
        text: 'Моя посещаемость',
        icon: <HowToReg />,
        path: '/attendance/my',
      },
      {
        text: 'Сканировать QR-код',
        icon: <QrCode2 />,
        path: '/attendance/scan',
      },
      {
        text: 'Мои оценки',
        icon: <Assessment />,
        path: '/grades',
      },
    ];
    
    const teacherItems: MenuItem[] = [
      {
        text: 'Учет посещаемости',
        icon: <EventAvailable />,
        path: '/attendance/teacher',
      },
      {
        text: 'Журнал оценок',
        icon: <School />,
        path: '/teacher/grades',
      },
    ];
    
    const adminItems: MenuItem[] = [
      {
        text: 'Посещаемость (администрирование)',
        icon: <Leaderboard />,
        path: '/attendance/admin',
      },
      {
        text: 'Управление группами',
        icon: <Group />,
        path: '/admin/groups',
      },
      {
        text: 'Управление пользователями',
        icon: <Person />,
        path: '/admin/users',
      },
      {
        text: 'Настройки системы',
        icon: <Settings />,
        path: '/admin/settings',
      },
    ];
    
    if (!user) return commonItems;
    
    if (user.role === UserRole.STUDENT) {
      return [...commonItems, ...studentItems];
    }
    
    if (user.role === UserRole.TEACHER || user.role === UserRole.HEAD_OF_DEPARTMENT) {
      return [...commonItems, ...teacherItems];
    }
    
    if (user.role === UserRole.ADMIN) {
      return [...commonItems, ...adminItems];
    }
    
    return commonItems;
  };
  
  const menuItems = getMenuItems();
  
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
            {user.role === UserRole.STUDENT ? 'Студент' : user.role === UserRole.TEACHER ? 'Преподаватель' : user.role === UserRole.ADMIN ? 'Администратор' : 'Заведующий кафедрой'}
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
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              component={Link}
              to={item.path}
              selected={location.pathname === item.path}
              onClick={isMobile ? onClose : undefined}
              sx={{
                py: 1,
                minHeight: 48,
                borderRadius: '0 24px 24px 0',
                mx: 1,
                '&.Mui-selected': {
                  backgroundColor: 'rgba(25, 118, 210, 0.08)',
                },
                '&.Mui-selected:hover': {
                  backgroundColor: 'rgba(25, 118, 210, 0.12)',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: 2,
                  justifyContent: 'center',
                  color: location.pathname === item.path ? 'primary.main' : 'text.secondary',
                }}
              >
                {item.icon}
              </ListItemIcon>
              <ListItemText
                primary={item.text}
                primaryTypographyProps={{
                  fontWeight: location.pathname === item.path ? 600 : 400,
                  color: location.pathname === item.path ? 'primary.main' : 'text.primary',
                }}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
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