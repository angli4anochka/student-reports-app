import React, { useState } from 'react';
import { LessonType, Student, Group, WEEKDAYS } from '../../types/earnings';

interface QuickCreateModalProps {
  isOpen: boolean;
  dayIndex: number;
  time: string;
  lessonTypes: LessonType[];
  students: Student[];
  groups: Group[];
  onClose: () => void;
  onCreate: (data: {
    selectedDays: number[];
    time: string;
    lessonTypeId: string;
    studentId?: string;
    groupId?: string;
    studentName?: string;
    repeat: 'once' | 'weekly' | 'biweekly' | 'monthly';
  }) => void;
}

export const QuickCreateModal: React.FC<QuickCreateModalProps> = ({
  isOpen,
  dayIndex,
  time,
  lessonTypes,
  students,
  groups,
  onClose,
  onCreate,
}) => {
  const [lessonTypeId, setLessonTypeId] = useState(lessonTypes[0]?.id || '');
  const [entityType, setEntityType] = useState<'student' | 'group' | 'custom'>('student');
  const [studentId, setStudentId] = useState('');
  const [groupId, setGroupId] = useState('');
  const [studentName, setStudentName] = useState('');
  const [repeat, setRepeat] = useState<'once' | 'weekly' | 'biweekly' | 'monthly'>('weekly');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onCreate({
      selectedDays: [dayIndex],
      time,
      lessonTypeId,
      studentId: entityType === 'student' ? studentId : undefined,
      groupId: entityType === 'group' ? groupId : undefined,
      studentName: entityType === 'custom' ? studentName : undefined,
      repeat,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Создать занятие</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Day and Time */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <div className="text-sm text-gray-600">День и время</div>
            <div className="text-lg font-semibold text-gray-800">
              {WEEKDAYS[dayIndex]}, {time}
            </div>
          </div>

          {/* Lesson Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип занятия
            </label>
            <select
              value={lessonTypeId}
              onChange={(e) => setLessonTypeId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              required
            >
              {lessonTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name} ({type.pricePerHour} ₽/час)
                </option>
              ))}
            </select>
          </div>

          {/* Entity Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Кому занятие?
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setEntityType('student')}
                className={`flex-1 px-3 py-2 rounded-lg border ${
                  entityType === 'student'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Студент
              </button>
              <button
                type="button"
                onClick={() => setEntityType('group')}
                className={`flex-1 px-3 py-2 rounded-lg border ${
                  entityType === 'group'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Группа
              </button>
              <button
                type="button"
                onClick={() => setEntityType('custom')}
                className={`flex-1 px-3 py-2 rounded-lg border ${
                  entityType === 'custom'
                    ? 'bg-blue-500 text-white border-blue-500'
                    : 'bg-white text-gray-700 border-gray-300'
                }`}
              >
                Другое
              </button>
            </div>

            {/* Student Selection */}
            {entityType === 'student' && (
              <select
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Выберите студента...</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </select>
            )}

            {/* Group Selection */}
            {entityType === 'group' && (
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Выберите группу...</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            )}

            {/* Custom Name */}
            {entityType === 'custom' && (
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="Введите имя..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            )}
          </div>

          {/* Repeat Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Повторение
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="once"
                  checked={repeat === 'once'}
                  onChange={(e) => setRepeat(e.target.value as any)}
                  className="mr-2"
                />
                <span>Один раз (только эта неделя)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="weekly"
                  checked={repeat === 'weekly'}
                  onChange={(e) => setRepeat(e.target.value as any)}
                  className="mr-2"
                />
                <span>Каждую неделю</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="biweekly"
                  checked={repeat === 'biweekly'}
                  onChange={(e) => setRepeat(e.target.value as any)}
                  className="mr-2"
                />
                <span>Раз в две недели</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="monthly"
                  checked={repeat === 'monthly'}
                  onChange={(e) => setRepeat(e.target.value as any)}
                  className="mr-2"
                />
                <span>Раз в месяц</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              Создать
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
