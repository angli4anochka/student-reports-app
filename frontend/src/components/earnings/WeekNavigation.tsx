import React from 'react';

interface WeekNavigationProps {
  currentWeekStart: string;
  onNavigateWeek: (direction: 'prev' | 'next' | 'today') => void;
}

export const WeekNavigation: React.FC<WeekNavigationProps> = ({
  currentWeekStart,
  onNavigateWeek,
}) => {
  const formatWeekRange = (weekStart: string) => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);

    const options: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'long'
    };
    const startStr = start.toLocaleDateString('ru-RU', options);
    const endStr = end.toLocaleDateString('ru-RU', options);
    const year = start.getFullYear();

    // If same month
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()}-${end.getDate()} ${start.toLocaleDateString('ru-RU', { month: 'long' })} ${year}`;
    } else {
      return `${startStr} - ${endStr} ${year}`;
    }
  };

  const isCurrentWeek = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);

    const currentMonday = new Date(currentWeekStart);
    currentMonday.setHours(0, 0, 0, 0);

    return monday.getTime() === currentMonday.getTime();
  };

  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onNavigateWeek('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Предыдущая неделя"
        >
          ←
        </button>

        <h2 className="text-xl font-semibold">
          {formatWeekRange(currentWeekStart)}
        </h2>

        <button
          onClick={() => onNavigateWeek('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          title="Следующая неделя"
        >
          →
        </button>

        {!isCurrentWeek() && (
          <button
            onClick={() => onNavigateWeek('today')}
            className="ml-2 px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
          >
            Сегодня
          </button>
        )}
      </div>
    </div>
  );
};