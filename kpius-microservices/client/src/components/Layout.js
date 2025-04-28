import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from './Navbar';
import '../styles/Layout.css';

// Компонент для общей структуры страниц приложения
const Layout = () => {
  return (
    <div className="app-container">
      <Navbar />
      <main className="main-content">
        <Outlet />
      </main>
      <footer className="footer">
        <p>© {new Date().getFullYear()} KPiUS - Система учета посещаемости</p>
      </footer>
    </div>
  );
};

export default Layout; 