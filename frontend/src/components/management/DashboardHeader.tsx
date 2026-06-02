import React from 'react';
import { DashboardHeaderProps } from '../../types/management';
import { getGreeting, todayISO } from '../../utils/dateUtils';

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  firstName,
  selectedDate,
  activeToday,
  dayEarnings,
  onPreviousDay,
  onNextDay,
  onToday,
  onAddStudent,
}) => {
  const formatDateTitle = () => {
    const today = new Date(todayISO());
    const selected = new Date(selectedDate);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Format dates to YYYY-MM-DD for comparison
    const tomorrowISO = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    let prefix = '';
    if (selectedDate === todayISO()) {
      prefix = 'Сегодня у вас';
    } else if (selectedDate === tomorrowISO) {
      prefix = 'Уроки завтра';
    } else {
      prefix = `Уроки ${selected.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}`;
    }

    const count = activeToday;
    const lessonsWord = count === 1 ? 'урок' : count >= 2 && count <= 4 ? 'урока' : 'уроков';

    // For "Сегодня у вас" we keep the full phrase, for others we add count
    if (selectedDate === todayISO()) {
      return `${prefix} ${count} ${lessonsWord}`;
    } else {
      return `${prefix}: ${count} ${lessonsWord}`;
    }
  };

  return (
    <div className="relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6"
         style={{ boxShadow: '0 35px 90px -45px rgba(0,0,0,0.30)' }}>
      {/* decorative blob */}
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-blue-200 opacity-30 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10">
        <p className="text-slate-500 text-sm mb-0.5">
          {getGreeting()}, {firstName}
        </p>
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-xl font-bold text-slate-800 mt-0 mb-0">
            {formatDateTitle()}
          </h2>
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={onPreviousDay}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/80 border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              title="Предыдущий день"
            >
              ←
            </button>
            <button
              onClick={onToday}
              disabled={selectedDate === todayISO()}
              className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white/80 border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Сегодня
            </button>
            <button
              onClick={onNextDay}
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/80 border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
              title="Следующий день"
            >
              →
            </button>
          </div>
          <button
            onClick={onAddStudent}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-blue-500 text-white text-sm font-semibold shadow-sm hover:bg-blue-600 transition"
          >
            + Добавить ученика
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-sm">Доход за день</span>
          <span className="font-bold text-slate-800 text-base">
            {dayEarnings} ₽
          </span>
        </div>
      </div>
    </div>
  );
};