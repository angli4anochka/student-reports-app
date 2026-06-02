import React, { useState } from 'react';
import { Clock, User, AlertCircle, UserX, RotateCcw } from 'lucide-react';

interface ScheduleSlot {
  id: string;
  studentId: string | null;
  studentName?: string; // Preserved name for deleted students
  student?: {
    id: string;
    fullName: string;
    isDeleted?: boolean;
    deletedAt?: string;
  };
  teacher: {
    id: string;
    email: string;
  };
  dayOfWeek: number;
  time: string;
  isActive: boolean;
  deactivatedAt?: string;
  deactivationReason?: string;
}

interface ScheduleSlotCardProps {
  slot: ScheduleSlot;
  onEdit?: (slot: ScheduleSlot) => void;
  onDelete?: (slotId: string) => void;
  onRestore?: (slotId: string) => void;
  onReassign?: (slotId: string) => void;
}

/**
 * Component for displaying schedule slot with proper handling of deleted students
 */
export const ScheduleSlotCard: React.FC<ScheduleSlotCardProps> = ({
  slot,
  onEdit,
  onDelete,
  onRestore,
  onReassign
}) => {
  const [showActions, setShowActions] = useState(false);

  // Determine the student name to display
  const getStudentDisplayName = (): { name: string; status: 'active' | 'deleted' | 'orphaned' } => {
    // If we have an active student reference
    if (slot.student && !slot.student.isDeleted) {
      return { name: slot.student.fullName, status: 'active' };
    }

    // If student was soft deleted but we have the reference
    if (slot.student?.isDeleted) {
      return { name: slot.student.fullName, status: 'deleted' };
    }

    // If we have a preserved name (from when student was deleted)
    if (slot.studentName) {
      return { name: slot.studentName, status: 'deleted' };
    }

    // If we have a studentId but no student object (data inconsistency)
    if (slot.studentId && !slot.student) {
      return { name: 'Ученик (данные не найдены)', status: 'orphaned' };
    }

    // No student at all
    return { name: 'Свободный слот', status: 'orphaned' };
  };

  const { name: displayName, status } = getStudentDisplayName();

  // Determine slot status styling
  const getStatusStyles = () => {
    if (!slot.isActive) {
      return 'bg-gray-100 border-gray-300 opacity-60';
    }

    switch (status) {
      case 'active':
        return 'bg-white border-green-300 hover:border-green-400';
      case 'deleted':
        return 'bg-red-50 border-red-300 hover:border-red-400';
      case 'orphaned':
        return 'bg-yellow-50 border-yellow-300 hover:border-yellow-400';
      default:
        return 'bg-white border-gray-300';
    }
  };

  const getDayName = (day: number): string => {
    const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
    return days[day];
  };

  const formatDeactivationReason = (reason?: string): string => {
    const reasons: Record<string, string> = {
      'student_deleted': 'Ученик удален',
      'manual_deactivation': 'Деактивирован вручную',
      'schedule_change': 'Изменение расписания',
      'orphaned_slot_cleanup': 'Очистка потерянных слотов'
    };
    return reasons[reason || ''] || reason || 'Неизвестно';
  };

  return (
    <div
      className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${getStatusStyles()}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Status Indicator */}
      {status === 'deleted' && (
        <div className="absolute top-2 right-2">
          <div className="group relative">
            <UserX className="w-5 h-5 text-red-500" />
            <div className="absolute hidden group-hover:block right-0 top-6 bg-gray-800 text-white text-xs rounded p-2 w-48 z-10">
              Ученик удален{slot.student?.deletedAt && ` ${new Date(slot.student.deletedAt).toLocaleDateString()}`}
            </div>
          </div>
        </div>
      )}

      {status === 'orphaned' && (
        <div className="absolute top-2 right-2">
          <div className="group relative">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            <div className="absolute hidden group-hover:block right-0 top-6 bg-gray-800 text-white text-xs rounded p-2 w-48 z-10">
              Требуется внимание: слот без ученика
            </div>
          </div>
        </div>
      )}

      {/* Slot Information */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="font-medium">
              {getDayName(slot.dayOfWeek)}, {slot.time}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <User className={`w-4 h-4 ${status === 'active' ? 'text-green-500' : 'text-gray-400'}`} />
          <span className={`${status === 'deleted' ? 'line-through text-gray-500' : ''}`}>
            {displayName}
          </span>
        </div>

        <div className="text-sm text-gray-500">
          Преподаватель: {slot.teacher.email}
        </div>

        {/* Deactivation Info */}
        {!slot.isActive && slot.deactivationReason && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs text-gray-600">
            <div>Деактивирован: {formatDeactivationReason(slot.deactivationReason)}</div>
            {slot.deactivatedAt && (
              <div>Дата: {new Date(slot.deactivatedAt).toLocaleDateString()}</div>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      {showActions && (
        <div className="absolute bottom-2 right-2 flex space-x-2">
          {status === 'orphaned' && onReassign && (
            <button
              onClick={() => onReassign(slot.id)}
              className="p-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              title="Назначить ученика"
            >
              <User className="w-4 h-4" />
            </button>
          )}

          {status === 'deleted' && slot.student?.id && onRestore && (
            <button
              onClick={() => onRestore(slot.student!.id)}
              className="p-1 bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              title="Восстановить ученика"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}

          {onEdit && slot.isActive && status === 'active' && (
            <button
              onClick={() => onEdit(slot)}
              className="p-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition-colors"
              title="Редактировать"
            >
              ✏️
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(slot.id)}
              className="p-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              title="Удалить слот"
            >
              🗑️
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default ScheduleSlotCard;