import React from 'react';
import { Box, Typography } from '@mui/material';
import { getGradeColor } from '../../utils/gradeUtils';

interface GradeIndicatorProps {
  value: string | number;
  size?: 'small' | 'medium' | 'large';
  showValue?: boolean;
}

/**
 * Компонент для отображения индикатора оценки
 */
const GradeIndicator: React.FC<GradeIndicatorProps> = ({ 
  value, 
  size = 'medium',
  showValue = true
}) => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  const color = getGradeColor(numericValue);
  
  // Определяем размеры в зависимости от параметра size
  const getSizeValues = () => {
    switch (size) {
      case 'small':
        return { width: '28px', height: '28px', fontSize: '0.875rem' };
      case 'large':
        return { width: '48px', height: '48px', fontSize: '1.25rem' };
      case 'medium':
      default:
        return { width: '36px', height: '36px', fontSize: '1rem' };
    }
  };
  
  const { width, height, fontSize } = getSizeValues();
  
  return (
    <Box
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 'bold',
        width,
        height,
        borderRadius: '50%',
        bgcolor: `${color}20`,
        color: color
      }}
    >
      {showValue && (
        <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize }}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </Typography>
      )}
    </Box>
  );
};

export default GradeIndicator; 