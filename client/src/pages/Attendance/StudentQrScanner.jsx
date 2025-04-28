import React from 'react';

const StudentQrScanner = () => {
  return (
    <div>
      <h1>Сканер QR-кода</h1>
      <p>Сканируйте QR-код для отметки посещаемости.</p>
      <div style={{ 
        width: '300px', 
        height: '300px', 
        border: '2px dashed #ccc', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        margin: '20px auto'
      }}>
        Здесь будет QR-сканер
      </div>
    </div>
  );
};

export default StudentQrScanner; 