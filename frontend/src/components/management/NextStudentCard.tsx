import React, { useState, useEffect } from 'react';
import { NextStudentCardProps } from '../../types/management';
import { formatTime, dotDateToISO } from '../../utils/dateUtils';

export const NextStudentCard: React.FC<NextStudentCardProps> = ({
  todaySlots,
  allLessons,
  selectedDate,
  findLessonsForSlot,
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Find next student
  const findNextStudent = () => {
    // Check if selected date is today
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const isToday = selectedDate === todayStr;

    // Convert slots to minutes for comparison
    const slotsWithMinutes = todaySlots
      .map(slot => {
        const [hours, minutes] = (slot.time || '00:00').split(':').map(Number);
        const slotMinutes = hours * 60 + minutes;
        return { slot, slotMinutes };
      })
      .sort((a, b) => a.slotMinutes - b.slotMinutes);

    // If not today, return the first slot by time
    if (!isToday) {
      return slotsWithMinutes.length > 0 ? slotsWithMinutes[0].slot : null;
    }

    // If today, filter by current time and return next upcoming slot
    const currentMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
    const upcomingSlots = slotsWithMinutes.filter(({ slotMinutes }) => slotMinutes > currentMinutes);

    return upcomingSlots.length > 0 ? upcomingSlots[0].slot : null;
  };

  const nextSlot = findNextStudent();

  if (!nextSlot) {
    return (
      <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-5"
           style={{ boxShadow: '0 35px 90px -45px rgba(0,0,0,0.30)' }}>
        <h3 className="text-sm font-semibold text-slate-700 mb-3 mt-0 flex items-center gap-2">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-100 text-purple-600 text-base">⏰</span>
          Следующий ученик
        </h3>
        <p className="text-slate-400 text-sm italic">Больше нет уроков на сегодня</p>
      </div>
    );
  }

  // Get student name
  const studentName = nextSlot.student?.fullName || nextSlot.studentName || nextSlot.group?.name || 'Ученик';

  // Find previous lesson homework
  const matched = findLessonsForSlot(allLessons, nextSlot);
  const prevLesson = matched
    .filter(l => dotDateToISO(l.date) < selectedDate)
    .sort((a, b) => dotDateToISO(b.date).localeCompare(dotDateToISO(a.date)))[0];

  const prevHomework = prevLesson?.homework || '';

  // Make links clickable in homework text
  const renderHomeworkWithLinks = (text: string) => {
    if (!text) return null;

    // URL regex pattern
    const urlPattern = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlPattern);

    return parts.map((part, index) => {
      if (part.match(urlPattern)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 underline"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-5"
         style={{ boxShadow: '0 35px 90px -45px rgba(0,0,0,0.30)' }}>
      <h3 className="text-sm font-semibold text-slate-700 mb-3 mt-0 flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-purple-100 text-purple-600 text-base">⏰</span>
        Следующий ученик
      </h3>

      <div className="flex items-start justify-between gap-4">
        {/* Left: Time + Student Name */}
        <div className="flex-shrink-0">
          <div className="text-2xl font-bold text-slate-800 mb-1">
            {formatTime(nextSlot.time)}
          </div>
          <div className="text-base font-medium text-slate-700">
            {studentName}
          </div>
        </div>

        {/* Right: Previous Homework */}
        <div className="flex-1 text-right">
          {prevHomework ? (
            <div className="text-sm text-slate-600">
              <div className="font-semibold text-slate-500 mb-1">
                ДЗ ({prevLesson?.date}):
              </div>
              <div className="text-slate-700 break-words">
                {renderHomeworkWithLinks(prevHomework)}
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-400 italic">
              Нет прошлого ДЗ
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
