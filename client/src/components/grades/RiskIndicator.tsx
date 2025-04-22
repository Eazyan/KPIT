import React from 'react';
import { Box, Typography } from '@mui/material';
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
}

/**
 * Компонент для отображения индикатора риска отчисления
 */
const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  probability,
  showPercentage = false,
  showDescription = true,
  showScale = false
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
  
  return (
    <Box>
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center'
      }}>
        {getIcon()}
        <Typography variant="subtitle1">Риск отчисления</Typography>
      </Box>
      
      <Box sx={{ 
        marginTop: '10px', 
        padding: '8px', 
        borderRadius: '4px', 
        backgroundColor: 'rgba(0,0,0,0.05)',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 'bold',
            color: '#333',
            marginRight: '10px'
          }}
        >
          {category}
        </Typography>
        
        {showPercentage && (
          <Typography variant="body2" sx={{ color: '#666' }}>
            {getRangeText()}
          </Typography>
        )}
      </Box>
      
      {showScale && (
        <Box sx={{ marginTop: '15px' }}>
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
        <Typography variant="caption" color="textSecondary" sx={{ marginTop: '8px', display: 'block' }}>
          {getDescriptionText()}
        </Typography>
      )}
    </Box>
  );
};

export default RiskIndicator; 