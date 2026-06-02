import React from 'react';
import { ScheduleSlot, WEEKDAYS, TIMES } from '../../types/earnings';

interface ScheduleTableProps {
  schedule: ScheduleSlot[];
  currentWeekStart: string;
  updatingSlots: Set<string>;
  onUpdateCompletedLesson: (lessonId: string, completed: boolean, paid: boolean) => void;
  onEditSlot: (slot: ScheduleSlot, weekStart: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onCreateSlot?: (dayIndex: number, time: string) => void;
  onDragStart?: (slot: ScheduleSlot) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent, dayIndex: number, time: string) => void;
  onDrop?: (e: React.DragEvent, dayIndex: number, time: string) => void;
  draggedSlot?: ScheduleSlot | null;
  dragOverCell?: { dayIndex: number; time: string } | null;
}

export const ScheduleTable: React.FC<ScheduleTableProps> = ({
  schedule,
  currentWeekStart,
  updatingSlots,
  onUpdateCompletedLesson,
  onEditSlot,
  onDeleteSlot,
  onCreateSlot,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  draggedSlot,
  dragOverCell,
}) => {
  const getSlotForDayAndTime = (dayIndex: number, time: string) => {
    return schedule.find((slot) => slot.dayOfWeek === dayIndex && slot.time.startsWith(time));
  };

  const getCompletedLessonForSlot = (slot: ScheduleSlot) => {
    return (slot.completedLessons || []).find((cl) => cl.weekStart === currentWeekStart);
  };

  const handleCheckboxChange = (
    slot: ScheduleSlot,
    type: 'completed' | 'paid',
    currentValue: boolean
  ) => {
    const completedLesson = getCompletedLessonForSlot(slot);
    if (completedLesson) {
      const newCompleted = type === 'completed' ? !currentValue : completedLesson.completed;
      const newPaid = type === 'paid' ? !currentValue : completedLesson.paid;

      // If marking as paid, also mark as completed
      if (type === 'paid' && !currentValue && !completedLesson.completed) {
        onUpdateCompletedLesson(completedLesson.id, true, true);
      } else {
        onUpdateCompletedLesson(completedLesson.id, newCompleted, newPaid);
      }
    }
  };

  const formatStudentInfo = (slot: ScheduleSlot) => {
    const completedLesson = getCompletedLessonForSlot(slot);
    const studentName =
      completedLesson?.customStudentName ||
      slot.student?.fullName ||
      slot.group?.name ||
      slot.studentName ||
      'Не указан';

    const lessonType = completedLesson?.customLessonType || slot.lessonType;
    const customPrice = completedLesson?.customPrice;

    return {
      name: studentName,
      type: lessonType,
      customPrice,
    };
  };

  const getCurrentWeekDates = () => {
    const dates: string[] = [];
    const start = new Date(currentWeekStart);

    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date.getDate().toString());
    }

    return dates;
  };

  const weekDates = getCurrentWeekDates();
  const today = new Date();
  const todayIndex = today.getDay() === 0 ? 6 : today.getDay() - 1;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-sm font-semibold text-gray-700 w-20">Время</th>
            {WEEKDAYS.map((day, index) => (
              <th
                key={day}
                className={`border p-2 text-sm font-semibold text-gray-700 ${
                  index === todayIndex ? 'bg-blue-50' : ''
                }`}
              >
                <div>{day}</div>
                <div className="text-xs font-normal text-gray-500">{weekDates[index]}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {TIMES.map((time) => (
            <tr key={time} className="hover:bg-gray-50">
              <td className="border p-2 text-sm font-medium text-gray-600">{time}</td>
              {WEEKDAYS.map((_, dayIndex) => {
                const slot = getSlotForDayAndTime(dayIndex, time);
                const completedLesson = slot ? getCompletedLessonForSlot(slot) : null;
                const isUpdating = slot && updatingSlots.has(completedLesson?.id || '');
                const isDragOver =
                  dragOverCell?.dayIndex === dayIndex && dragOverCell?.time === time;

                if (!slot) {
                  return (
                    <td
                      key={`${dayIndex}-${time}`}
                      data-testid={`schedule-cell-${dayIndex}-${time}`}
                      className={`border p-2 cursor-pointer hover:bg-blue-50 ${isDragOver ? 'bg-blue-100' : ''}`}
                      onClick={() => onCreateSlot?.(dayIndex, time)}
                      onDragOver={(e) => onDragOver?.(e, dayIndex, time)}
                      onDrop={(e) => onDrop?.(e, dayIndex, time)}
                      title="Нажмите для создания занятия"
                    >
                      {/* Empty cell */}
                    </td>
                  );
                }

                const { name, type, customPrice } = formatStudentInfo(slot);
                const isCompleted = completedLesson?.completed || false;
                const isPaid = completedLesson?.paid || false;

                return (
                  <td
                    key={`${dayIndex}-${time}`}
                    data-testid={`schedule-slot-${slot.id}`}
                    className={`border p-2 relative ${
                      slot.hasOverride ? 'bg-yellow-50' : ''
                    } ${isDragOver ? 'bg-blue-100' : ''}`}
                    draggable
                    onDragStart={() => onDragStart?.(slot)}
                    onDragEnd={() => onDragEnd?.()}
                    onDragOver={(e) => onDragOver?.(e, dayIndex, time)}
                    onDrop={(e) => onDrop?.(e, dayIndex, time)}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        draggedSlot?.id === slot.id ? 'opacity-50' : ''
                      }`}
                      style={{
                        backgroundColor: type.color + '20',
                        borderLeft: `4px solid ${type.color}`,
                      }}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <div className="flex-1">
                          <div className="font-medium text-sm">{name}</div>
                          <div className="text-xs text-gray-600">{type.name}</div>
                          {customPrice && (
                            <div className="text-xs text-purple-600">
                              💰 {customPrice} ₽
                            </div>
                          )}
                          {slot.hasOverride && (
                            <div className="text-xs text-orange-600">
                              📅 Перенос с {slot.originalTime}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => onEditSlot(slot, currentWeekStart)}
                            className="text-xs p-1 hover:bg-white rounded"
                            title="Редактировать"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => onDeleteSlot(slot.id)}
                            className="text-xs p-1 hover:bg-white rounded"
                            title="Удалить"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={isCompleted}
                            onChange={() =>
                              handleCheckboxChange(slot, 'completed', isCompleted)
                            }
                            disabled={isUpdating}
                            className="w-4 h-4"
                            aria-label="completed"
                            data-testid={`completed-${completedLesson?.id}`}
                          />
                          <span>✓</span>
                        </label>
                        <label className="flex items-center gap-1 text-xs">
                          <input
                            type="checkbox"
                            checked={isPaid}
                            onChange={() => handleCheckboxChange(slot, 'paid', isPaid)}
                            disabled={isUpdating || !isCompleted}
                            className="w-4 h-4"
                            aria-label="paid"
                            data-testid={`paid-${completedLesson?.id}`}
                          />
                          <span>💰</span>
                        </label>
                      </div>
                      {isUpdating && (
                        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                        </div>
                      )}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};