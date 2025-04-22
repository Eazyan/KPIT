import React from 'react';
import { Box, Typography } from '@mui/material';

interface ProgressBarProps {
  value: number;
  max?: number;
  color?: string;
  height?: number;
  showValue?: boolean;
  label?: string;
  valueUnit?: string;
}

/**
 * Компонент для отображения прогресс-бара
 */
const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max = 100,
  color = '#1976d2',
  height = 8,
  showValue = false,
  label,
  valueUnit = ''
}) => {
  // Нормализация значения от 0 до max
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percentage = (normalizedValue / max) * 100;
  
  return (
    <Box sx={{ width: '100%' }}>
      {(label || (showValue)) && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 0.5 
        }}>
          {label && (
            <Typography variant="body2" color="textSecondary">
              {label}
            </Typography>
          )}
          
          {showValue && (
            <Typography variant="body2" fontWeight="medium">
              {normalizedValue}{valueUnit}
            </Typography>
          )}
        </Box>
      )}
      
      <Box sx={{ 
        height: `${height}px`, 
        width: '100%', 
        backgroundColor: 'rgba(0,0,0,0.1)', 
        borderRadius: '8px',
        overflow: 'hidden'
      }}>
        <Box
          sx={{
            height: '100%',
            width: `${percentage}%`,
            backgroundColor: color,
            borderRadius: '8px',
            transition: 'width 0.5s ease'
          }}
        />
      </Box>
    </Box>
  );
};

export default ProgressBar; 