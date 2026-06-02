import React from 'react';
import { LessonTypes } from './LessonTypes';
import {
  LessonType,
  TypeFormData,
  Student,
  Group,
  SlotFormData,
  WEEKDAYS,
  TIMES,
} from '../../types/earnings';

interface SettingsPanelProps {
  isOpen: boolean;
  lessonTypes: LessonType[];
  students: Student[];
  groups: Group[];
  showAddType: boolean;
  editingType: LessonType | null;
  typeForm: TypeFormData;
  showAddSlot: boolean;
  slotForm: SlotFormData;
  onClose: () => void;
  onShowAddType: (show: boolean) => void;
  onSetEditingType: (type: LessonType | null) => void;
  onSetTypeForm: (form: TypeFormData) => void;
  onCreateType: (data: TypeFormData) => void;
  onUpdateType: (id: string, data: TypeFormData) => void;
  onDeleteType: (id: string) => void;
  onShowAddSlot: (show: boolean) => void;
  onSetSlotForm: (form: SlotFormData) => void;
  onCreateSlot: (data: SlotFormData) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  isOpen,
  lessonTypes,
  students,
  groups,
  showAddType,
  editingType,
  typeForm,
  showAddSlot,
  slotForm,
  onClose,
  onShowAddType,
  onSetEditingType,
  onSetTypeForm,
  onCreateType,
  onUpdateType,
  onDeleteType,
  onShowAddSlot,
  onSetSlotForm,
  onCreateSlot,
}) => {
  if (!isOpen) return null;

  const handleSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateSlot(slotForm);
  };

  const handleSlotCancel = () => {
    onShowAddSlot(false);
    onSetSlotForm({
      selectedDays: [],
      time: '10:00',
      lessonTypeId: '',
      studentId: '',
      groupId: '',
      studentName: '',
    });
  };

  const toggleDaySelection = (dayIndex: number) => {
    const newDays = slotForm.selectedDays.includes(dayIndex)
      ? slotForm.selectedDays.filter(d => d !== dayIndex)
      : [...slotForm.selectedDays, dayIndex];
    onSetSlotForm({ ...slotForm, selectedDays: newDays });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-end">
      <div className="w-96 bg-white h-full shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white z-10 p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold">Настройки</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            ✕
          </button>
        </div>

        <div className="p-4 space-y-6">
          {/* Lesson Types Section */}
          <LessonTypes
            lessonTypes={lessonTypes}
            showAddType={showAddType}
            editingType={editingType}
            typeForm={typeForm}
            onShowAddType={onShowAddType}
            onSetEditingType={onSetEditingType}
            onSetTypeForm={onSetTypeForm}
            onCreateType={onCreateType}
            onUpdateType={onUpdateType}
            onDeleteType={onDeleteType}
          />

          {/* Schedule Slots Section */}
          <div className="bg-white rounded-lg shadow-sm p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Расписание</h3>
              {!showAddSlot && (
                <button
                  onClick={() => onShowAddSlot(true)}
                  className="px-3 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm"
                >
                  + Добавить слот
                </button>
              )}
            </div>

            {showAddSlot && (
              <form onSubmit={handleSlotSubmit} className="p-4 bg-gray-50 rounded-lg space-y-3">
                <h4 className="font-medium mb-3">Добавить слот в расписание</h4>

                {/* Days selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дни недели
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {WEEKDAYS.map((day, index) => (
                      <label
                        key={day}
                        className="flex items-center gap-1 text-sm cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={slotForm.selectedDays.includes(index)}
                          onChange={() => toggleDaySelection(index)}
                        />
                        <span>{day.slice(0, 3)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Time selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Время
                  </label>
                  <select
                    value={slotForm.time}
                    onChange={(e) => onSetSlotForm({ ...slotForm, time: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    {TIMES.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Student/Group selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Студент или группа
                  </label>
                  <select
                    value={slotForm.studentId || slotForm.groupId || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.startsWith('student_')) {
                        onSetSlotForm({
                          ...slotForm,
                          studentId: value.replace('student_', ''),
                          groupId: '',
                        });
                      } else if (value.startsWith('group_')) {
                        onSetSlotForm({
                          ...slotForm,
                          groupId: value.replace('group_', ''),
                          studentId: '',
                        });
                      } else if (value === 'custom') {
                        onSetSlotForm({
                          ...slotForm,
                          studentId: '',
                          groupId: '',
                          studentName: '',
                        });
                      }
                    }}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Выберите...</option>
                    <optgroup label="Студенты">
                      {students.map((student) => (
                        <option key={student.id} value={`student_${student.id}`}>
                          {student.fullName}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="Группы">
                      {groups.map((group) => (
                        <option key={group.id} value={`group_${group.id}`}>
                          {group.name}
                        </option>
                      ))}
                    </optgroup>
                    <option value="custom">Другой...</option>
                  </select>
                </div>

                {/* Custom student name */}
                {!slotForm.studentId && !slotForm.groupId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Имя студента
                    </label>
                    <input
                      type="text"
                      value={slotForm.studentName}
                      onChange={(e) =>
                        onSetSlotForm({ ...slotForm, studentName: e.target.value })
                      }
                      className="w-full px-3 py-2 border rounded-lg"
                      required
                    />
                  </div>
                )}

                {/* Lesson type selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип урока
                  </label>
                  <select
                    value={slotForm.lessonTypeId}
                    onChange={(e) =>
                      onSetSlotForm({ ...slotForm, lessonTypeId: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  >
                    <option value="">Выберите тип...</option>
                    {lessonTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} - {type.pricePerHour} ₽/час
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={slotForm.selectedDays.length === 0}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-400"
                  >
                    Добавить
                  </button>
                  <button
                    type="button"
                    onClick={handleSlotCancel}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};