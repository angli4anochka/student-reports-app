/**
 * Optimized ScheduleRow component with React.memo
 * Only re-renders when necessary props change
 */

import React from 'react';
import { ScheduleSlot } from '../../../types/earnings';

interface ScheduleRowProps {
  slot: ScheduleSlot;
  weekStart: string;
  isCompleted: boolean;
  isPaid: boolean;
  isUpdating: boolean;
  onToggleCompleted: (slotId: string) => void;
  onTogglePaid: (slotId: string) => void;
  onEdit: (slot: ScheduleSlot) => void;
  onDelete: (slotId: string) => void;
  onDragStart?: (slot: ScheduleSlot) => void;
  onDragEnd?: () => void;
}

// Memoized component for better performance
export const ScheduleRow = React.memo<ScheduleRowProps>(({
  slot,
  weekStart,
  isCompleted,
  isPaid,
  isUpdating,
  onToggleCompleted,
  onTogglePaid,
  onEdit,
  onDelete,
  onDragStart,
  onDragEnd,
}) => {
  const handleToggleCompleted = React.useCallback(() => {
    onToggleCompleted(slot.id);
  }, [slot.id, onToggleCompleted]);

  const handleTogglePaid = React.useCallback(() => {
    onTogglePaid(slot.id);
  }, [slot.id, onTogglePaid]);

  const handleEdit = React.useCallback(() => {
    onEdit(slot);
  }, [slot, onEdit]);

  const handleDelete = React.useCallback(() => {
    onDelete(slot.id);
  }, [slot.id, onDelete]);

  const handleDragStart = React.useCallback(() => {
    onDragStart?.(slot);
  }, [slot, onDragStart]);

  return (
    <div
      className={`
        flex items-center justify-between p-3 rounded-lg
        ${isCompleted ? 'bg-green-50' : 'bg-white'}
        ${isUpdating ? 'opacity-50' : ''}
        transition-all duration-200
      `}
      draggable={!isUpdating}
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      data-testid={`schedule-row-${slot.id}`}
    >
      <div className="flex items-center gap-4">
        <span className="text-sm font-medium text-gray-600">
          {slot.time}
        </span>
        <span className="text-sm font-semibold text-gray-800">
          {slot.student?.fullName || slot.group?.name || slot.studentName || 'Не указан'}
        </span>
        {slot.lessonType && (
          <span
            className="px-2 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${slot.lessonType.color}20`,
              color: slot.lessonType.color,
            }}
          >
            {slot.lessonType.name}
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Completed checkbox */}
        <button
          onClick={handleToggleCompleted}
          disabled={isUpdating}
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center
            transition-colors duration-200
            ${isCompleted
              ? 'bg-green-500 border-green-500 text-white'
              : 'bg-white border-gray-300 hover:border-green-400'
            }
            ${isUpdating ? 'cursor-not-allowed' : 'cursor-pointer'}
          `}
          title={isCompleted ? 'Отметить как не проведенный' : 'Отметить как проведенный'}
        >
          {isCompleted && (
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          )}
        </button>

        {/* Paid checkbox */}
        <button
          onClick={handleTogglePaid}
          disabled={isUpdating || !isCompleted}
          className={`
            w-5 h-5 rounded border-2 flex items-center justify-center
            transition-colors duration-200 text-xs font-bold
            ${isPaid
              ? 'bg-amber-500 border-amber-500 text-white'
              : isCompleted
              ? 'bg-white border-gray-300 hover:border-amber-400'
              : 'bg-gray-100 border-gray-200 cursor-not-allowed'
            }
            ${isUpdating ? 'cursor-not-allowed' : isCompleted ? 'cursor-pointer' : ''}
          `}
          title={isPaid ? 'Отметить как не оплаченный' : isCompleted ? 'Отметить как оплаченный' : 'Сначала отметьте как проведенный'}
        >
          {isPaid && '₽'}
        </button>

        {/* Edit button */}
        <button
          onClick={handleEdit}
          disabled={isUpdating}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
          title="Редактировать"
        >
          ✏️
        </button>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={isUpdating}
          className="p-1 hover:bg-red-50 rounded transition-colors text-red-500"
          title="Удалить"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison for optimization
  // Only re-render if these specific props change
  return (
    prevProps.slot.id === nextProps.slot.id &&
    prevProps.isCompleted === nextProps.isCompleted &&
    prevProps.isPaid === nextProps.isPaid &&
    prevProps.isUpdating === nextProps.isUpdating &&
    prevProps.weekStart === nextProps.weekStart &&
    // Deep compare only if lesson type changed
    prevProps.slot.lessonType?.id === nextProps.slot.lessonType?.id
  );
});

ScheduleRow.displayName = 'ScheduleRow';