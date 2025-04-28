import React, { useContext, useState } from 'react';
import { 
  AppBar as MuiAppBar, 
  Toolbar, 
  IconButton, 
  Typography, 
  Button, 
  Box, 
  Avatar, 
  Menu, 
  MenuItem, 
  ListItemIcon, 
  useMediaQuery, 
  useTheme 
} from '@mui/material';
import { 
  Menu as MenuIcon, 
  Notifications, 
  Person, 
  Settings, 
  Logout 
} from '@mui/icons-material';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';

interface AppBarProps {
  onDrawerToggle: () => void;
}

const AppBar: React.FC<AppBarProps> = ({ onDrawerToggle }) => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = () => {
    logout();
    handleClose();
    navigate('/login');
  };
  
  return (
    <MuiAppBar 
      position="fixed" 
      elevation={0}
      sx={{ 
        zIndex: theme.zIndex.drawer + 1,
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
        color: 'text.primary',
      }}
    >
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onDrawerToggle}
          sx={{ mr: 2, display: { sm: isMobile ? 'block' : 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        
        <Typography 
          variant="h6" 
          component={Link} 
          to="/"
          sx={{ 
            flexGrow: 1, 
            textDecoration: 'none', 
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {!isMobile && 'Система контроля посещаемости и успеваемости'}
          {isMobile && 'КПиУС'}
        </Typography>
        
        {user ? (
          <>
            <IconButton color="inherit" sx={{ mr: 1 }}>
              <Notifications />
            </IconButton>
            
            <IconButton
              onClick={handleClick}
              size="small"
              sx={{ ml: 2 }}
              aria-controls={open ? 'account-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: theme.palette.primary.main }}>
                {user?.name ? user.name.charAt(0) : '?'}
              </Avatar>
            </IconButton>
            
            <Menu
              anchorEl={anchorEl}
              id="account-menu"
              open={open}
              onClose={handleClose}
              onClick={handleClose}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              sx={{
                '& .MuiPaper-root': {
                  borderRadius: 2,
                  mt: 1,
                  boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.1)',
                  background: 'rgba(255, 255, 255, 0.9)',
                  backdropFilter: 'blur(20px)',
                }
              }}
            >
              <Box sx={{ px: 2, py: 1 }}>
                <Typography variant="subtitle1" fontWeight={500}>
                  {user?.name || 'Пользователь'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email || ''}
                </Typography>
              </Box>
              
              <MenuItem component={Link} to="/profile" onClick={handleClose}>
                <ListItemIcon>
                  <Person fontSize="small" />
                </ListItemIcon>
                Мой профиль
              </MenuItem>
              
              <MenuItem component={Link} to="/settings" onClick={handleClose}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                Настройки
              </MenuItem>
              
              <MenuItem onClick={handleLogout}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                Выйти
              </MenuItem>
            </Menu>
          </>
        ) : (
          <Box>
            <Button 
              component={Link} 
              to="/login" 
              variant="outlined" 
              color="primary"
              sx={{ mr: 1, borderRadius: 2 }}
            >
              Войти
            </Button>
            <Button 
              component={Link} 
              to="/register" 
              variant="contained" 
              color="primary"
              sx={{ borderRadius: 2 }}
            >
              Регистрация
            </Button>
          </Box>
        )}
      </Toolbar>
    </MuiAppBar>
  );
};

export default AppBar; 