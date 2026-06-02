import React from 'react';

interface LessonTypeStats {
  name: string;
  color: string;
  completed: number;
  paid: number;
  earnings: number;
  price: number;
}

interface EarningsStatsProps {
  weeklyEarnings: any;
  periodEarnings: { firstHalf: any; secondHalf: any };
  earningsByType: LessonTypeStats[];
}

export const EarningsStats: React.FC<EarningsStatsProps> = ({
  weeklyEarnings,
  periodEarnings,
  earningsByType
}) => {
  return (
    <div style={{ marginBottom: '30px' }}>
      {/* Weekly Earnings Summary */}
      {weeklyEarnings && (
        <div style={{
          padding: '20px',
          background: '#e3f2fd',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#1976d2' }}>
            Заработано за неделю
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '15px'
          }}>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                Проведено уроков
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1976d2' }}>
                {weeklyEarnings.totalCompleted || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                Оплачено уроков
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4caf50' }}>
                {weeklyEarnings.totalPaid || 0}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '5px' }}>
                Итого заработано
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2e7d32' }}>
                {weeklyEarnings.totalEarnings || 0} ₽
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Period Earnings */}
      {(periodEarnings.firstHalf || periodEarnings.secondHalf) && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '15px',
          marginBottom: '20px'
        }}>
          {/* First Half */}
          {periodEarnings.firstHalf && (
            <div style={{
              padding: '15px',
              background: '#fff3e0',
              borderRadius: '8px',
              border: '2px solid #ff9800'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#e65100' }}>
                Первая половина месяца (1-15)
              </h4>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '3px' }}>
                Проведено: {periodEarnings.firstHalf.totalCompleted || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '3px' }}>
                Оплачено: {periodEarnings.firstHalf.totalPaid || 0}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e65100' }}>
                {periodEarnings.firstHalf.totalEarnings || 0} ₽
              </div>
            </div>
          )}

          {/* Second Half */}
          {periodEarnings.secondHalf && (
            <div style={{
              padding: '15px',
              background: '#f3e5f5',
              borderRadius: '8px',
              border: '2px solid #9c27b0'
            }}>
              <h4 style={{ margin: '0 0 10px 0', color: '#6a1b9a' }}>
                Вторая половина месяца (16-31)
              </h4>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '3px' }}>
                Проведено: {periodEarnings.secondHalf.totalCompleted || 0}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '3px' }}>
                Оплачено: {periodEarnings.secondHalf.totalPaid || 0}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#6a1b9a' }}>
                {periodEarnings.secondHalf.totalEarnings || 0} ₽
              </div>
            </div>
          )}
        </div>
      )}

      {/* Earnings by Lesson Type */}
      {earningsByType.length > 0 && (
        <div style={{
          padding: '20px',
          background: 'white',
          borderRadius: '8px',
          border: '1px solid #e0e0e0'
        }}>
          <h3 style={{ margin: '0 0 15px 0' }}>По типам уроков</h3>
          <div style={{
            display: 'grid',
            gap: '10px'
          }}>
            {earningsByType.map(stat => (
              <div
                key={stat.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px',
                  background: '#f9f9f9',
                  borderRadius: '4px',
                  borderLeft: `4px solid ${stat.color}`
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>
                    {stat.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {stat.price} ₽/час
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Проведено: {stat.completed} | Оплачено: {stat.paid}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: stat.color }}>
                    {stat.earnings} ₽
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
