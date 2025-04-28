import React from 'react';

const Layout = ({ children }) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      minHeight: '100vh' 
    }}>
      <header style={{ 
        backgroundColor: '#2196f3', 
        color: 'white', 
        padding: '10px 20px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: 0 }}>КПиУС ДВФУ</h1>
      </header>
      
      <main style={{ flex: 1, padding: '20px' }}>
        {children}
      </main>
      
      <footer style={{ 
        backgroundColor: '#f5f5f5', 
        padding: '10px 20px', 
        textAlign: 'center',
        borderTop: '1px solid #e0e0e0'
      }}>
        &copy; 2025 КПиУС ДВФУ
      </footer>
    </div>
  );
};

export default Layout; 