import React from 'react';
import { Box, Typography } from '@mui/material';
import { 
  TrendingUp,
  TrendingDown,
  TrendingFlat
} from '@mui/icons-material';
import { getTrendText, getTrendIconAndColor } from '../../utils/gradeUtils';

interface TrendIndicatorProps {
  trend: string;
  showLabel?: boolean;
  showDescription?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Компонент для отображения тренда
 */
const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  trend,
  showLabel = true,
  showDescription = false,
  size = 'medium'
}) => {
  const { icon, color } = getTrendIconAndColor(trend);
  
  // Выбор иконки на основе типа тренда
  const getIcon = () => {
    const iconProps = { fontSize: size };
    
    switch (icon) {
      case 'TrendingUp':
        return <TrendingUp {...iconProps} />;
      case 'TrendingDown':
        return <TrendingDown {...iconProps} />;
      case 'TrendingFlat':
      default:
        return <TrendingFlat {...iconProps} />;
    }
  };
  
  // Описание тренда для подсказки
  const getTrendDescription = () => {
    if (trend.includes('improving')) return 'Успеваемость растет';
    if (trend.includes('declining')) return 'Успеваемость падает';
    return 'Успеваемость стабильна';
  };
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: 'rgba(0,0,0,0.05)'
      }}
    >
      <Box sx={{ color }}>
        {getIcon()}
      </Box>
      
      {(showLabel || showDescription) && (
        <Box sx={{ marginLeft: '5px' }}>
          {showLabel && (
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 'bold',
                color: '#333'
              }}
            >
              {showDescription ? 'Тренд: ' : ''}{getTrendText(trend)}
            </Typography>
          )}
          
          {showDescription && (
            <Typography variant="caption" color="textSecondary">
              {getTrendDescription()}
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
};

export default TrendIndicator; 