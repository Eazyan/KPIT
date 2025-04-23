import React from 'react';
import { Box, Typography, LinearProgress, Tooltip } from '@mui/material';
import {
  CheckCircle,
  Shield,
  ReportProblem
} from '@mui/icons-material';
import { RISK_COLORS, getRiskCategory } from '../../utils/gradeUtils';

interface RiskIndicatorProps {
  probability: number;
  showPercentage?: boolean;
  showDescription?: boolean;
  showScale?: boolean;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Компонент для отображения индикатора риска отчисления
 */
const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  probability,
  showPercentage = false,
  showDescription = true,
  showScale = false,
  size = 'medium'
}) => {
  const { category, color } = getRiskCategory(probability);
  
  // Выбор иконки в зависимости от категории риска
  const getIcon = () => {
    if (category === 'Нет риска') {
      return <CheckCircle style={{ marginRight: '8px', color: RISK_COLORS.none }} />;
    } else if (category === 'Низкий риск') {
      return <Shield style={{ marginRight: '8px', color: RISK_COLORS.low }} />;
    } else {
      return <ReportProblem style={{ marginRight: '8px', color }} />;
    }
  };
  
  // Получение текста диапазона вероятности
  const getRangeText = () => {
    if (category === 'Нет риска') return '(0-10%)';
    if (category === 'Низкий риск') return '(11-25%)';
    if (category === 'Средний риск') return '(26-50%)';
    if (category === 'Высокий риск') return '(51-75%)';
    return '(76-100%)';
  };
  
  // Получение описания для категории риска
  const getDescriptionText = () => {
    if (category === 'Нет риска') {
      return 'Риск отчисления минимален. Продолжайте в том же духе!';
    } else if (category === 'Низкий риск') {
      return 'Низкий риск отчисления. Обратите внимание на проблемные дисциплины.';
    } else if (category === 'Средний риск') {
      return 'Средний риск отчисления. Рекомендуется улучшить посещаемость и успеваемость.';
    } else if (category === 'Высокий риск') {
      return 'Высокий риск отчисления. Срочно обратитесь к куратору!';
    } else {
      return 'Критический риск отчисления. Требуется немедленная консультация с деканатом!';
    }
  };
  
  const icon = getIcon();
  
  return (
    <Box sx={{ width: '100%' }}>
      {showPercentage && (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 1 
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            {icon}
            <Typography 
              variant="body2" 
              sx={{ 
                ml: 0.5, 
                fontWeight: 500,
                color: 'rgba(0, 0, 0, 0.6)'
              }}
            >
              {getRiskCategory(probability).category}
            </Typography>
          </Box>
          <Typography variant="h5" fontWeight="bold" color="#333">
            {Math.round(probability)}%
          </Typography>
        </Box>
      )}
      
      {showScale && (
        <Box sx={{ mt: 2, mb: 1 }}>
          <Box sx={{ 
            display: 'flex', 
            width: '100%', 
            height: '24px', 
            borderRadius: '4px', 
            overflow: 'hidden'
          }}>
            <Box sx={{ flex: 1, height: '100%', backgroundColor: RISK_COLORS.none, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '10px' }}>
                НЕТ
              </Typography>
            </Box>
            <Box sx={{ flex: 1, height: '100%', backgroundColor: RISK_COLORS.low, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '10px' }}>
                НИЗКИЙ
              </Typography>
            </Box>
            <Box sx={{ flex: 1, height: '100%', backgroundColor: RISK_COLORS.medium, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '10px' }}>
                СРЕДНИЙ
              </Typography>
            </Box>
            <Box sx={{ flex: 1, height: '100%', backgroundColor: RISK_COLORS.high, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '10px' }}>
                ВЫСОКИЙ
              </Typography>
            </Box>
            <Box sx={{ flex: 1, height: '100%', backgroundColor: RISK_COLORS.critical, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold', fontSize: '10px' }}>
                КРИТИЧ
              </Typography>
            </Box>
          </Box>
          <Box sx={{ 
            position: 'relative', 
            height: '16px', 
            marginTop: '4px' 
          }}>
            <Box sx={{
              position: 'absolute',
              left: `${probability}%`,
              transform: 'translateX(-50%)',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              backgroundColor: color,
              border: '2px solid white',
              boxShadow: '0 0 4px rgba(0,0,0,0.3)'
            }}></Box>
          </Box>
        </Box>
      )}
      
      {showDescription && (
        <Typography 
          variant="caption" 
          color="textSecondary" 
          sx={{ 
            mt: 1,
            display: 'block',
            fontSize: '0.75rem'
          }}
        >
          {getDescriptionText()}
        </Typography>
      )}
    </Box>
  );
};

export default RiskIndicator; 