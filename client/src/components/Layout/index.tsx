import React, { useState, ReactNode } from 'react';
import { 
  Box, 
  AppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  useMediaQuery, 
  useTheme,
  Avatar
} from '@mui/material';
import { Menu as MenuIcon } from '@mui/icons-material';
import Sidebar from './Sidebar';
import { useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../../context/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

const drawerWidth = 240;

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const location = useLocation();
  const { user } = useContext(AuthContext);
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  // Получаем заголовок страницы на основе текущего маршрута
  const getPageTitle = () => {
    const pathname = location.pathname;
    
    if (pathname === '/') return 'Главная';
    if (pathname === '/attendance') return 'Учет посещаемости';
    if (pathname === '/scan-qr') return 'Сканирование QR-кода';
    if (pathname === '/schedule') return 'Расписание';
    if (pathname === '/grades') return 'Мои оценки';
    
    // Admin routes
    if (pathname.startsWith('/admin/groups')) return 'Управление группами';
    if (pathname.startsWith('/admin/users')) return 'Управление пользователями';
    if (pathname.startsWith('/admin/settings')) return 'Настройки системы';
    
    // Teacher routes
    if (pathname.startsWith('/teacher/grades')) return 'Журнал оценок';
    
    return 'ДВФУ КПиУС';
  };
  
  // Получаем сокращение имени пользователя для аватара
  const getUserInitials = () => {
    if (!user) return '';
    
    const nameParts = user.name.split(' ');
    if (nameParts.length >= 2) {
      return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase();
    }
    
    return nameParts[0][0].toUpperCase();
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', background: '#f5f5f5' }}>
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
          boxShadow: 'none',
          borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(20px)',
        }}
      >
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' }, color: 'text.primary' }}
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" fontWeight={600} color="text.primary" noWrap>
              {getPageTitle()}
            </Typography>
          </Box>
          
          {user && (
            <Avatar 
              sx={{ 
                bgcolor: 'primary.main',
                width: 36,
                height: 36,
                fontWeight: 600,
                fontSize: '0.9rem'
              }}
            >
              {getUserInitials()}
            </Avatar>
          )}
        </Toolbar>
      </AppBar>
      
      <Sidebar
        open={mobileOpen}
        onClose={handleDrawerToggle}
        drawerWidth={drawerWidth}
      />
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
          maxWidth: '100%',
          overflowX: 'hidden',
        }}
      >
        {children}
      </Box>
    </Box>
  );
}; 