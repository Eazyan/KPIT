import React, { ReactNode } from 'react';
import { Box, Typography, SvgIconProps } from '@mui/material';
import ProgressBar from './ProgressBar';

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  iconColor?: string;
  backgroundColor?: string;
  progress?: number;
  progressMax?: number;
  progressColor?: string;
  subtitle?: string;
  trend?: ReactNode;
  children?: ReactNode;
}

/**
 * Компонент для отображения карточки статистики
 */
const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon,
  iconColor = '#1976d2',
  backgroundColor = 'white',
  progress,
  progressMax = 100,
  progressColor,
  subtitle,
  trend,
  children
}) => {
  return (
    <Box
      sx={{
        backgroundColor,
        border: `2px solid ${iconColor}`,
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        marginBottom: '12px'
      }}>
        <Box sx={{ color: iconColor, marginRight: '10px' }}>
          {icon}
        </Box>
        <Typography variant="subtitle1" fontWeight="medium">{title}</Typography>
      </Box>
      
      {value && (
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 'bold', 
            margin: '10px 0',
            color: '#333'
          }}
        >
          {value}
          {subtitle && (
            <Typography variant="caption" sx={{ marginLeft: '8px', fontWeight: 'normal' }}>
              {subtitle}
            </Typography>
          )}
        </Typography>
      )}
      
      {progress !== undefined && (
        <Box sx={{ my: 1 }}>
          <ProgressBar 
            value={progress} 
            max={progressMax}
            color={progressColor || iconColor}
          />
        </Box>
      )}
      
      {trend && (
        <Box sx={{ mt: 1, pt: 1 }}>
          {trend}
        </Box>
      )}
      
      <Box sx={{ mt: value ? 1 : 0 }}>
        {children}
      </Box>
    </Box>
  );
};

export default StatsCard; 