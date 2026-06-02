import React from 'react';

interface LessonType {
  id: string;
  name: string;
  color: string;
  pricePerHour: number;
}

interface Student {
  id: string;
  fullName: string;
}

interface Group {
  id: string;
  name: string;
}

interface CompletedLesson {
  id: string;
  weekStart: string;
  completed: boolean;
  paid: boolean;
  customPrice?: number | null;
  customStudentName?: string | null;
  customStudentId?: string | null;
  customGroupId?: string | null;
  customStudent?: Student | null;
  customGroup?: Group | null;
  customLessonTypeId?: string | null;
  customLessonType?: LessonType | null;
}

interface ScheduleSlot {
  id: string;
  dayOfWeek: number;
  time: string;
  studentName?: string;
  studentId?: string;
  groupId?: string;
  student?: Student;
  group?: Group;
  lessonTypeId: string;
  lessonType: LessonType;
  completedLessons: CompletedLesson[];
}

interface ScheduleCellProps {
  slot: ScheduleSlot | undefined;
  dayIndex: number;
  time: string;
  currentWeekStart: string;
  isUpdating: boolean;
  isDragOver: boolean;
  onLessonClick: (slot: ScheduleSlot) => void;
  onDeleteSlot: (id: string) => void;
  onEditSlot: (slot: ScheduleSlot, weekStart: string) => void;
  onDragStart: (e: React.DragEvent, slot: ScheduleSlot) => void;
  onDragOver: (e: React.DragEvent, dayIndex: number, time: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, dayIndex: number, time: string) => void;
}

export const ScheduleCell: React.FC<ScheduleCellProps> = ({
  slot,
  dayIndex,
  time,
  currentWeekStart,
  isUpdating,
  isDragOver,
  onLessonClick,
  onDeleteSlot,
  onEditSlot,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop
}) => {
  if (!slot) {
    // Empty cell
    return (
      <div
        style={{
          border: '1px solid #e0e0e0',
          minHeight: '80px',
          background: isDragOver ? '#e3f2fd' : 'white',
          borderRadius: '4px',
          transition: 'background 0.2s'
        }}
        onDragOver={(e) => onDragOver(e, dayIndex, time)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, dayIndex, time)}
      />
    );
  }

  const completedLessons = Array.isArray(slot.completedLessons) ? slot.completedLessons : [];
  const completed = completedLessons.find(cl => cl.weekStart === currentWeekStart);

  // Determine card style based on status
  let cardStyle: React.CSSProperties = {
    cursor: isUpdating ? 'wait' : 'pointer',
    opacity: isUpdating ? 0.6 : 1
  };

  const lessonType = completed?.customLessonTypeId && completed.customLessonType
    ? completed.customLessonType
    : slot.lessonType;

  if (!completed?.completed) {
    // Not completed - default border
    cardStyle.background = 'white';
    cardStyle.border = `2px solid ${lessonType.color}`;
  } else if (completed.completed && !completed.paid) {
    // Completed but not paid - yellow background
    cardStyle.background = '#fff9c4';
    cardStyle.border = `2px solid ${lessonType.color}`;
  } else {
    // Completed and paid - green background
    cardStyle.background = '#c8e6c9';
    cardStyle.border = `2px solid #4caf50`;
  }

  const displayStudent = completed?.customStudentId && completed.customStudent
    ? completed.customStudent
    : slot.student;

  const displayGroup = completed?.customGroupId && completed.customGroup
    ? completed.customGroup
    : slot.group;

  const displayStudentName = completed?.customStudentName || slot.studentName;

  const price = completed?.customPrice !== null && completed?.customPrice !== undefined
    ? completed.customPrice
    : lessonType.pricePerHour || 0;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, slot)}
      onDragOver={(e) => onDragOver(e, dayIndex, time)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, dayIndex, time)}
      onClick={() => !isUpdating && onLessonClick(slot)}
      style={{
        padding: '10px',
        borderRadius: '4px',
        position: 'relative',
        minHeight: '80px',
        transition: 'all 0.2s',
        background: isDragOver ? '#e3f2fd' : cardStyle.background,
        border: cardStyle.border,
        cursor: cardStyle.cursor,
        opacity: cardStyle.opacity
      }}
    >
      <div style={{ marginBottom: '5px', fontWeight: 'bold', color: lessonType.color }}>
        {lessonType.name}
      </div>

      {(displayStudent || displayGroup || displayStudentName) && (
        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>
          {displayStudent?.fullName || displayGroup?.name || displayStudentName || 'Не указан'}
        </div>
      )}

      <div style={{ fontSize: '12px', color: '#888' }}>
        {price} ₽/час
      </div>

      <div style={{ marginTop: '8px', display: 'flex', gap: '5px' }}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEditSlot(slot, currentWeekStart);
          }}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            background: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          ✏️ Изменить
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDeleteSlot(slot.id);
          }}
          style={{
            padding: '4px 8px',
            fontSize: '11px',
            background: '#f44336',
            color: 'white',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer'
          }}
        >
          🗑️ Удалить
        </button>
      </div>

      {/* Status indicator */}
      {completed?.completed && (
        <div style={{
          position: 'absolute',
          top: '5px',
          right: '5px',
          fontSize: '16px'
        }}>
          {completed.paid ? '✅' : '⏳'}
        </div>
      )}
    </div>
  );
};
