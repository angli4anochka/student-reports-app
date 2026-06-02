import React from 'react';
import { formatWeekDisplay } from '../../utils/earningsHelpers';

interface WeekNavigatorProps {
  currentWeekStart: string;
  onChangeWeek: (direction: number) => void;
  onShowSettings: () => void;
}

export const WeekNavigator: React.FC<WeekNavigatorProps> = ({
  currentWeekStart,
  onChangeWeek,
  onShowSettings
}) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '20px',
      padding: '15px',
      background: '#f5f5f5',
      borderRadius: '8px'
    }}>
      <button
        onClick={() => onChangeWeek(-1)}
        style={{
          padding: '8px 16px',
          background: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        ← Предыдущая неделя
      </button>

      <div style={{
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#333'
      }}>
        {formatWeekDisplay(currentWeekStart)}
      </div>

      <button
        onClick={() => onChangeWeek(1)}
        style={{
          padding: '8px 16px',
          background: '#2196F3',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        Следующая неделя →
      </button>

      <button
        onClick={onShowSettings}
        style={{
          padding: '8px 16px',
          background: '#4CAF50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '14px'
        }}
      >
        ⚙️ Настройки
      </button>
    </div>
  );
};
