import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface ScheduleSlot {
  id: string;
  dayOfWeek: number;
  time: string;
  studentName?: string;
  studentId?: string;
  groupId?: string;
  student?: { id: string; fullName: string };
  group?: { id: string; name: string };
  lessonType?: {
    id: string;
    name: string;
    color: string;
    pricePerHour: number;
  };
}

interface Teacher {
  id: string;
  fullName: string;
  email: string;
  schedule: ScheduleSlot[];
}

const DAYS_OF_WEEK = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

const AllTeachersSchedule: React.FC = () => {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSchedule();
  }, []);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const data = await api.getOrganizationSchedule();
      setTeachers(data.teachers);
    } catch (err) {
      console.error('Error loading organization schedule:', err);
      setError('Ошибка при загрузке расписания');
    } finally {
      setLoading(false);
    }
  };

  // Get all unique time slots across all teachers
  const getAllTimeSlots = (): string[] => {
    const timesSet = new Set<string>();
    teachers.forEach(teacher => {
      teacher.schedule.forEach(slot => {
        timesSet.add(slot.time);
      });
    });
    return Array.from(timesSet).sort();
  };

  // Get slot for specific teacher, day, and time
  const getSlotForTeacher = (teacherId: string, dayOfWeek: number, time: string): ScheduleSlot | null => {
    const teacher = teachers.find(t => t.id === teacherId);
    if (!teacher) return null;
    return teacher.schedule.find(s => s.dayOfWeek === dayOfWeek && s.time === time) || null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
        Загрузка расписания...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 text-red-500 text-sm">
        {error}
      </div>
    );
  }

  if (teachers.length === 0) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400 text-sm">
        Нет учителей в организации
      </div>
    );
  }

  const allTimes = getAllTimeSlots();

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6"
         style={{ boxShadow: '0 35px 90px -45px rgba(0,0,0,0.30)' }}>
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 text-xl">
          📅
        </span>
        Сводное расписание учителей
      </h3>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-slate-100 border border-slate-300 px-3 py-2 text-left font-semibold text-slate-700">
                День / Время
              </th>
              {teachers.map(teacher => (
                <th
                  key={teacher.id}
                  className="border border-slate-300 px-3 py-2 text-center font-semibold text-slate-700 bg-blue-50 min-w-[120px]"
                >
                  <div className="flex flex-col items-center gap-0.5">
                    <span>{teacher.fullName}</span>
                    <span className="text-xs text-slate-500 font-normal">{teacher.email}</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAYS_OF_WEEK.map((dayName, dayIndex) => {
              // Check if any teacher has lessons on this day
              const hasLessonsOnDay = teachers.some(teacher =>
                teacher.schedule.some(slot => slot.dayOfWeek === dayIndex)
              );

              if (!hasLessonsOnDay) return null; // Skip days with no lessons

              return (
                <React.Fragment key={dayIndex}>
                  {allTimes.map((time, timeIndex) => {
                    // Check if any teacher has a lesson at this time on this day
                    const hasLessonsAtTime = teachers.some(teacher =>
                      teacher.schedule.some(slot => slot.dayOfWeek === dayIndex && slot.time === time)
                    );

                    if (!hasLessonsAtTime) return null; // Skip times with no lessons

                    const isFirstTimeForDay = allTimes.slice(0, timeIndex).every(t =>
                      !teachers.some(teacher =>
                        teacher.schedule.some(slot => slot.dayOfWeek === dayIndex && slot.time === t)
                      )
                    );

                    return (
                      <tr key={`${dayIndex}-${time}`} className="hover:bg-slate-50 transition">
                        <td className="sticky left-0 z-10 bg-white border border-slate-300 px-3 py-2 font-medium text-slate-700">
                          {isFirstTimeForDay ? (
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800">{dayName}</span>
                              <span className="text-slate-600">{time}</span>
                            </div>
                          ) : (
                            <span className="text-slate-600 ml-4">{time}</span>
                          )}
                        </td>
                        {teachers.map(teacher => {
                          const slot = getSlotForTeacher(teacher.id, dayIndex, time);

                          if (!slot) {
                            return (
                              <td key={teacher.id} className="border border-slate-300 px-2 py-2 bg-slate-50/30">
                                {/* Empty cell */}
                              </td>
                            );
                          }

                          const displayName = slot.student?.fullName || slot.group?.name || slot.studentName || 'Урок';

                          return (
                            <td
                              key={teacher.id}
                              className="border border-slate-300 px-2 py-2 text-center"
                            >
                              <span className="text-xs text-slate-700">
                                {displayName} ({teacher.fullName})
                              </span>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllTeachersSchedule;
