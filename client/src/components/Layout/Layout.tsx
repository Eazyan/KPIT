import React, { useState } from 'react';
import { Box, Toolbar, CssBaseline, IconButton, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import AppBar from './AppBar';
import Sidebar from './Sidebar';

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
      
      <AppBar onDrawerToggle={handleDrawerToggle} />
      
      <Sidebar
        open={sidebarOpen}
        onClose={handleDrawerToggle}
        drawerWidth={drawerWidth}
        variant={isMobile ? 'temporary' : 'persistent'}
      />
      
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
        {!isMobile && (
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{
              position: 'fixed',
              left: sidebarOpen ? drawerWidth - 28 : 12,
              top: 72,
              zIndex: 1100,
              bgcolor: 'background.paper',
              borderRadius: '50%',
              boxShadow: 1,
              transition: theme.transitions.create(['left'], {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
              '&:hover': {
                bgcolor: 'background.paper',
              },
            }}
          >
            <MenuIcon />
          </IconButton>
        )}
        {children}
      </Box>
    </Box>
  );
};

export default Layout; 