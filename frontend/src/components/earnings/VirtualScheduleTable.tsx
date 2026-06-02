/**
 * Virtual Schedule Table using react-window for performance
 * Efficiently renders large schedule lists
 */

import React from 'react';
import { MemoizedVirtualList } from '../shared/VirtualList';
import { ScheduleRow } from './optimized/ScheduleRow';
import { ScheduleSlot } from '../../types/earnings';

interface VirtualScheduleTableProps {
  schedule: ScheduleSlot[];
  currentWeekStart: string;
  updatingSlots: Set<string>;
  onUpdateCompletedLesson: (id: string, completed: boolean, paid: boolean) => Promise<void>;
  onEditSlot: (slot: ScheduleSlot) => void;
  onDeleteSlot: (id: string) => Promise<void>;
  onDragStart?: (slot: ScheduleSlot) => void;
  onDragEnd?: () => void;
}

export const VirtualScheduleTable: React.FC<VirtualScheduleTableProps> = ({
  schedule,
  currentWeekStart,
  updatingSlots,
  onUpdateCompletedLesson,
  onEditSlot,
  onDeleteSlot,
  onDragStart,
  onDragEnd,
}) => {
  // Group schedule by day
  const scheduleByDay = React.useMemo(() => {
    const grouped: Record<number, ScheduleSlot[]> = {};

    schedule.forEach(slot => {
      if (!grouped[slot.dayOfWeek]) {
        grouped[slot.dayOfWeek] = [];
      }
      grouped[slot.dayOfWeek].push(slot);
    });

    // Sort by time within each day
    Object.values(grouped).forEach(slots => {
      slots.sort((a, b) => a.time.localeCompare(b.time));
    });

    return grouped;
  }, [schedule]);

  // Flatten schedule for virtual list
  const flattenedSchedule = React.useMemo(() => {
    const flattened: (ScheduleSlot | { isDayHeader: true; day: number })[] = [];
    const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];

    for (let day = 0; day < 7; day++) {
      const daySlots = scheduleByDay[day];
      if (daySlots && daySlots.length > 0) {
        // Add day header
        flattened.push({ isDayHeader: true, day });
        // Add slots for this day
        flattened.push(...daySlots);
      }
    }

    return flattened;
  }, [scheduleByDay]);

  // Render function for virtual list items
  const renderScheduleItem = React.useCallback(
    (item: any, index: number) => {
      // Day header
      if (item.isDayHeader) {
        const days = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
        return (
          <div className="sticky top-0 bg-gray-100 px-4 py-2 font-semibold text-gray-700 border-b">
            {days[item.day]}
          </div>
        );
      }

      // Schedule slot
      const slot = item as ScheduleSlot;
      const completedLesson = (slot.completedLessons || []).find(
        cl => cl.weekStart === currentWeekStart
      );

      const isCompleted = completedLesson?.completed || false;
      const isPaid = completedLesson?.paid || false;
      const isUpdating = updatingSlots.has(slot.id);

      const handleToggleCompleted = async () => {
        if (completedLesson) {
          await onUpdateCompletedLesson(completedLesson.id, !isCompleted, isPaid);
        }
      };

      const handleTogglePaid = async () => {
        if (completedLesson && isCompleted) {
          await onUpdateCompletedLesson(completedLesson.id, isCompleted, !isPaid);
        }
      };

      return (
        <ScheduleRow
          key={slot.id}
          slot={slot}
          weekStart={currentWeekStart}
          isCompleted={isCompleted}
          isPaid={isPaid}
          isUpdating={isUpdating}
          onToggleCompleted={handleToggleCompleted}
          onTogglePaid={handleTogglePaid}
          onEdit={onEditSlot}
          onDelete={onDeleteSlot}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
      );
    },
    [
      currentWeekStart,
      updatingSlots,
      onUpdateCompletedLesson,
      onEditSlot,
      onDeleteSlot,
      onDragStart,
      onDragEnd,
    ]
  );

  // Calculate item height (headers are smaller)
  const getItemHeight = React.useCallback((index: number) => {
    const item = flattenedSchedule[index];
    return item && 'isDayHeader' in item ? 40 : 60;
  }, [flattenedSchedule]);

  // Use virtual scrolling for large schedules (>50 items)
  if (flattenedSchedule.length > 50) {
    return (
      <div className="h-[600px] bg-white rounded-lg shadow-sm">
        <MemoizedVirtualList
          items={flattenedSchedule}
          itemHeight={60} // Average height
          renderItem={renderScheduleItem}
          className="p-4"
          emptyMessage="Нет уроков в расписании"
        />
      </div>
    );
  }

  // For small schedules, use regular rendering
  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      {flattenedSchedule.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          Нет уроков в расписании
        </div>
      ) : (
        <div className="space-y-2">
          {flattenedSchedule.map((item, index) => (
            <div key={index}>
              {renderScheduleItem(item, index)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Export memoized version
export default React.memo(VirtualScheduleTable);