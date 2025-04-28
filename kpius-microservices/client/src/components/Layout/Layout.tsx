import React, { useState } from 'react';
import { Box, Toolbar, CssBaseline, IconButton, useMediaQuery, useTheme, Typography } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';

interface LayoutProps {
  children: React.ReactNode;
}

const drawerWidth = 240;

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

  const handleDrawerToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <CssBaseline />
      
      {/* Здесь будет AppBar */}
      <Box
        component="header"
        sx={{
          position: 'fixed',
          width: '100%',
          height: '64px',
          bgcolor: 'primary.main',
          color: 'white',
          zIndex: 1100,
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
        }}
      >
        <Typography variant="h6">КПиУС Микросервисы</Typography>
      </Box>
      
      {/* Здесь будет Sidebar */}
      
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { sm: `100%` },
          ml: { sm: sidebarOpen ? `${drawerWidth}px` : 0 },
          mt: '64px',
          transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.leavingScreen,
          }),
          backgroundColor: 'background.default',
          backgroundImage: 'linear-gradient(135deg, rgba(220, 235, 255, 0.1) 0%, rgba(255, 255, 255, 0.2) 100%)',
          minHeight: 'calc(100vh - 64px)',
        }}
      >
        <Toolbar />
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 