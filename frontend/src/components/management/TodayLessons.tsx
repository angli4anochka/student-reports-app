import React from 'react';
import { TodayLessonsProps } from '../../types/management';
import { formatTime, isoToDotDate, dotDateToISO } from '../../utils/dateUtils';

export const TodayLessons: React.FC<TodayLessonsProps> = ({
  todaySlots,
  allLessons,
  selectedDate,
  slotCompleted,
  slotPaid,
  onToggleCompleted,
  onOpenHomework,
  findLessonsForSlot,
}) => {
  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-5"
         style={{ boxShadow: '0 35px 90px -45px rgba(0,0,0,0.30)' }}>
      <h3 className="text-sm font-semibold text-slate-700 mb-3 mt-0 flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100 text-blue-600 text-base">📖</span>
        Уроки сегодня
      </h3>
      {todaySlots.length === 0 ? (
        <p className="text-slate-400 text-sm italic">Нет уроков</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {todaySlots.map((slot) => {
            const isCompleted = !!slotCompleted[slot.id];
            const isPaid = !!slotPaid[slot.id];

            // Get lessons for this slot
            const matched = findLessonsForSlot(allLessons, slot);
            const selectedDot = isoToDotDate(selectedDate);

            // Today's lesson — first try name/id match, then fallback to time match
            const todayLesson = matched.find(l => l.date === selectedDot) ||
              allLessons.find(l => l.date === selectedDot && slot.time && l.time === slot.time);

            const hasHomeworkToday = !!(todayLesson?.topic || todayLesson?.homework);

            // Previous lesson homework (for tooltip)
            const prevLesson = matched
              .filter(l => dotDateToISO(l.date) < selectedDate)
              .sort((a, b) => dotDateToISO(b.date).localeCompare(dotDateToISO(a.date)))[0];
            const hw = prevLesson?.homework;

            return (
              <li key={slot.id}
                className="flex items-center justify-between rounded-lg px-2 py-1.5 transition"
              >
                {/* time + name — left */}
                <span className={`text-sm font-medium ${isCompleted ? 'text-slate-500 line-through' : 'text-slate-700'}`}>
                  {formatTime(slot.time)} – {slot.student?.fullName || slot.studentName || slot.group?.name || 'Ученик'}
                </span>
                {/* controls — right */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* ДЗ button — green if homework saved for today */}
                  <button
                    type="button"
                    onClick={() => onOpenHomework(slot)}
                    className={`text-xs font-semibold px-2 py-1 rounded-lg border transition ${
                      hasHomeworkToday
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                        : 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100'
                    }`}
                    title={hasHomeworkToday
                      ? `ДЗ сохранено: ${todayLesson?.homework || todayLesson?.topic}`
                      : hw
                        ? `ДЗ из предыдущего урока: ${hw}`
                        : 'Добавить домашнее задание'}
                  >
                    ДЗ
                  </button>
                  {/* Three-state checkbox: empty → completed (✓) → paid (₽) */}
                  <button
                    type="button"
                    onClick={() => onToggleCompleted(slot.id)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center transition text-xs font-bold ${
                      isPaid
                        ? 'bg-amber-500 border-amber-500 text-white'
                        : isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : 'bg-white border-slate-300 hover:border-emerald-400'
                    }`}
                    title={isPaid ? 'Оплачен' : isCompleted ? 'Прошел' : 'Не прошел'}
                  >
                    {isPaid ? '₽' : isCompleted && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};