import React from 'react';
import { WeeklyEarnings, PeriodEarnings } from '../../types/earnings';

interface EarningsSummaryProps {
  weeklyEarnings: WeeklyEarnings | null;
  periodEarnings: PeriodEarnings;
  currentWeekStart: string;
  onCreatePayout: (period: 'first' | 'second') => void;
}

export const EarningsSummary: React.FC<EarningsSummaryProps> = ({
  weeklyEarnings,
  periodEarnings,
  currentWeekStart,
  onCreatePayout,
}) => {
  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);

    const startDay = start.getDate();
    const endDay = end.getDate();
    const month = start.toLocaleDateString('ru-RU', { month: 'long' });

    return `${startDay}-${endDay} ${month}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-4">
      {/* Weekly Summary */}
      {weeklyEarnings && (
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4">
            Неделя {formatWeekRange(currentWeekStart)}
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {weeklyEarnings.completedCount}
              </div>
              <div className="text-sm text-gray-600">
                из {weeklyEarnings.totalLessons || weeklyEarnings.completedCount} проведено
              </div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {weeklyEarnings.paidCount}
              </div>
              <div className="text-sm text-gray-600">оплачено</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(weeklyEarnings.totalEarnings)}
              </div>
              <div className="text-sm text-gray-600">заработано</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(weeklyEarnings.potentialEarnings || 0)}
              </div>
              <div className="text-sm text-gray-600">потенциал</div>
            </div>
          </div>
        </div>
      )}

      {/* Period Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* First half of month */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-semibold">Первая половина месяца</h4>
            <span className="text-sm text-gray-500">1-15</span>
          </div>
          {periodEarnings.firstHalf ? (
            <>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Проведено:</span>
                  <span className="font-medium">
                    {periodEarnings.firstHalf.completedCount} уроков
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Оплачено:</span>
                  <span className="font-medium text-green-600">
                    {periodEarnings.firstHalf.paidCount} уроков
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Итого:</span>
                  <span className="text-blue-600">
                    {formatCurrency(periodEarnings.firstHalf.totalEarnings)}
                  </span>
                </div>
              </div>
              {periodEarnings.firstHalf.paidCount > 0 && (
                <button
                  onClick={() => onCreatePayout('first')}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Оформить выплату
                </button>
              )}
            </>
          ) : (
            <div className="text-gray-500 text-center py-4">Нет данных</div>
          )}
        </div>

        {/* Second half of month */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-start mb-4">
            <h4 className="font-semibold">Вторая половина месяца</h4>
            <span className="text-sm text-gray-500">16-31</span>
          </div>
          {periodEarnings.secondHalf ? (
            <>
              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Проведено:</span>
                  <span className="font-medium">
                    {periodEarnings.secondHalf.completedCount} уроков
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Оплачено:</span>
                  <span className="font-medium text-green-600">
                    {periodEarnings.secondHalf.paidCount} уроков
                  </span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Итого:</span>
                  <span className="text-blue-600">
                    {formatCurrency(periodEarnings.secondHalf.totalEarnings)}
                  </span>
                </div>
              </div>
              {periodEarnings.secondHalf.paidCount > 0 && (
                <button
                  onClick={() => onCreatePayout('second')}
                  className="w-full px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  Оформить выплату
                </button>
              )}
            </>
          ) : (
            <div className="text-gray-500 text-center py-4">Нет данных</div>
          )}
        </div>
      </div>
    </div>
  );
};