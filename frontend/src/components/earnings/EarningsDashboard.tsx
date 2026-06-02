import React, { useState } from 'react';
import { useEarnings } from '../../hooks/useEarnings';
import { WeekNavigation } from './WeekNavigation';
import { EarningsSummary } from './EarningsSummary';
import { ScheduleTable } from './ScheduleTable';
import { SettingsPanel } from './SettingsPanel';
import { QuickCreateModal } from './QuickCreateModal';
import { ScheduleSlot } from '../../types/earnings';

export const EarningsDashboard: React.FC = () => {
  const {
    // Data
    lessonTypes,
    students,
    groups,
    schedule,
    currentWeekStart,
    weeklyEarnings,
    periodEarnings,
    loading,
    error,
    updatingSlots,

    // UI state
    showAddType,
    setShowAddType,
    showAddSlot,
    setShowAddSlot,
    editingType,
    setEditingType,
    editingSlot,
    setEditingSlot,
    editingBaseSlot,
    setEditingBaseSlot,

    // Forms
    baseSlotForm,
    setBaseSlotForm,
    typeForm,
    setTypeForm,
    slotForm,
    setSlotForm,
    customSlotForm,
    setCustomSlotForm,

    // Operations
    updateCompletedLesson,
    createLessonType,
    updateLessonType,
    deleteLessonType,
    createScheduleSlot,
    updateScheduleSlot,
    deleteScheduleSlot,
    createScheduleOverride,
    navigateWeek,
    createPayout,

    // Reload functions
    loadData,
    loadSchedule,
    loadWeeklyEarnings,
    loadPeriodEarnings,
  } = useEarnings();

  const [showSettings, setShowSettings] = useState(false);
  const [draggedSlot, setDraggedSlot] = useState<ScheduleSlot | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ dayIndex: number; time: string } | null>(
    null
  );
  const [quickCreateSlot, setQuickCreateSlot] = useState<{ dayIndex: number; time: string } | null>(
    null
  );

  // Quick create slot handler
  const handleCreateSlot = (dayIndex: number, time: string) => {
    setQuickCreateSlot({ dayIndex, time });
  };

  const handleQuickCreate = async (data: any) => {
    try {
      await createScheduleSlot(data);
      setQuickCreateSlot(null);
    } catch (error) {
      console.error('Failed to create slot:', error);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (slot: ScheduleSlot) => {
    setDraggedSlot(slot);
  };

  const handleDragEnd = () => {
    setDraggedSlot(null);
    setDragOverCell(null);
  };

  const handleDragOver = (e: React.DragEvent, dayIndex: number, time: string) => {
    e.preventDefault();
    setDragOverCell({ dayIndex, time });
  };

  const handleDrop = async (e: React.DragEvent, dayIndex: number, time: string) => {
    e.preventDefault();
    if (!draggedSlot) return;

    // Get base position (from personal_schedule_slots table)
    const baseDayOfWeek = draggedSlot.baseDayOfWeek ?? draggedSlot.dayOfWeek;
    const baseTime = draggedSlot.baseTime ?? draggedSlot.time;

    console.log('🔍 handleDrop DEBUG:', {
      currentWeekStart,
      draggedSlot: {
        id: draggedSlot.id,
        currentDay: draggedSlot.dayOfWeek,
        currentTime: draggedSlot.time,
        baseDayOfWeek: draggedSlot.baseDayOfWeek,
        baseTime: draggedSlot.baseTime,
        hasOverride: draggedSlot.hasOverride,
      },
      dropPosition: { dayIndex, time },
      calculatedBase: { baseDayOfWeek, baseTime },
    });

    // Check if dropping on the same current position (no change needed)
    if (draggedSlot.dayOfWeek === dayIndex && draggedSlot.time.startsWith(time)) {
      console.log('⏹️ Dropping on same position - no change');
      handleDragEnd();
      return;
    }

    // Check if dropping on the BASE position (remove override)
    if (baseDayOfWeek === dayIndex && baseTime.startsWith(time)) {
      // If there's an override, delete it (reverting to base schedule)
      console.log('🔄 Dropping on base position - should delete override');
      // TODO: implement deleteScheduleOverride API call
      handleDragEnd();
      return;
    }

    // Create schedule override for this specific week only
    // This ensures changes apply ONLY to the current week, not future weeks
    console.log('✅ Creating override for week:', currentWeekStart);
    try {
      await createScheduleOverride(
        draggedSlot.id,
        currentWeekStart,
        dayIndex,
        time
      );
      console.log('✅ Override created successfully');
    } catch (error) {
      console.error('❌ Failed to create override:', error);
    }

    handleDragEnd();
  };

  // Edit slot modal handlers
  const handleEditSlot = (slot: ScheduleSlot) => {
    setEditingBaseSlot(slot);
    setBaseSlotForm({
      studentId: slot.studentId || '',
      groupId: slot.groupId || '',
      studentName: slot.studentName || '',
    });
  };

  const handleUpdateSlot = async () => {
    if (!editingBaseSlot) return;

    try {
      await updateScheduleSlot(editingBaseSlot.id, baseSlotForm);
      setEditingBaseSlot(null);
      setBaseSlotForm({ studentId: '', groupId: '', studentName: '' });
    } catch (error) {
      console.error('Failed to update slot:', error);
    }
  };

  // Edit custom slot for specific week
  const handleEditCustomSlot = (slot: ScheduleSlot, weekStart: string) => {
    const completedLesson = (slot.completedLessons || []).find((cl) => cl.weekStart === weekStart);

    setEditingSlot({ slot, weekStart });
    setCustomSlotForm({
      customLessonTypeId: completedLesson?.customLessonTypeId || '',
      customStudentId: completedLesson?.customStudentId || '',
      customGroupId: completedLesson?.customGroupId || '',
      customStudentName: completedLesson?.customStudentName || '',
      customPrice: completedLesson?.customPrice?.toString() || '',
    });
  };

  const handleUpdateCustomSlot = async () => {
    if (!editingSlot) return;

    const completedLesson = (editingSlot.slot.completedLessons || []).find(
      (cl) => cl.weekStart === editingSlot.weekStart
    );

    if (completedLesson) {
      try {
        await updateCompletedLesson(completedLesson.id, completedLesson.completed, completedLesson.paid);
        setEditingSlot(null);
        setCustomSlotForm({
          customLessonTypeId: '',
          customStudentId: '',
          customGroupId: '',
          customStudentName: '',
          customPrice: '',
        });
      } catch (error) {
        console.error('Failed to update custom slot:', error);
      }
    }
  };

  if (loading && schedule.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 text-red-600 p-4 rounded-lg">
        {error}
        <button
          onClick={() => loadData()}
          className="ml-4 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">💰 Заработки</h1>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-3 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow"
          title="Настройки"
        >
          ⚙️
        </button>
      </div>

      {/* Week Navigation */}
      <WeekNavigation
        currentWeekStart={currentWeekStart}
        onNavigateWeek={navigateWeek}
      />

      {/* Earnings Summary */}
      <EarningsSummary
        weeklyEarnings={weeklyEarnings}
        periodEarnings={periodEarnings}
        currentWeekStart={currentWeekStart}
        onCreatePayout={createPayout}
      />

      {/* Schedule Table */}
      <div className="mt-6 bg-white rounded-xl shadow-sm p-4">
        <ScheduleTable
          schedule={schedule}
          currentWeekStart={currentWeekStart}
          updatingSlots={updatingSlots}
          onUpdateCompletedLesson={updateCompletedLesson}
          onEditSlot={handleEditCustomSlot}
          onDeleteSlot={deleteScheduleSlot}
          onCreateSlot={handleCreateSlot}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          draggedSlot={draggedSlot}
          dragOverCell={dragOverCell}
        />
      </div>

      {/* Settings Panel */}
      <SettingsPanel
        isOpen={showSettings}
        lessonTypes={lessonTypes}
        students={students}
        groups={groups}
        showAddType={showAddType}
        editingType={editingType}
        typeForm={typeForm}
        showAddSlot={showAddSlot}
        slotForm={slotForm}
        onClose={() => setShowSettings(false)}
        onShowAddType={setShowAddType}
        onSetEditingType={setEditingType}
        onSetTypeForm={setTypeForm}
        onCreateType={createLessonType}
        onUpdateType={updateLessonType}
        onDeleteType={deleteLessonType}
        onShowAddSlot={setShowAddSlot}
        onSetSlotForm={setSlotForm}
        onCreateSlot={createScheduleSlot}
      />

      {/* Edit Base Slot Modal */}
      {editingBaseSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-xl font-semibold mb-4">Редактировать слот</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Студент или группа
                </label>
                <select
                  value={baseSlotForm.studentId || baseSlotForm.groupId || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value.startsWith('student_')) {
                      setBaseSlotForm({
                        ...baseSlotForm,
                        studentId: value.replace('student_', ''),
                        groupId: '',
                      });
                    } else if (value.startsWith('group_')) {
                      setBaseSlotForm({
                        ...baseSlotForm,
                        groupId: value.replace('group_', ''),
                        studentId: '',
                      });
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-lg"
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
                </select>
              </div>
              {!baseSlotForm.studentId && !baseSlotForm.groupId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Имя студента
                  </label>
                  <input
                    type="text"
                    value={baseSlotForm.studentName}
                    onChange={(e) =>
                      setBaseSlotForm({ ...baseSlotForm, studentName: e.target.value })
                    }
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleUpdateSlot}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setEditingBaseSlot(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Custom Slot Modal */}
      {editingSlot && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-xl font-semibold mb-4">
              Настройки урока для недели
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип урока
                </label>
                <select
                  value={customSlotForm.customLessonTypeId}
                  onChange={(e) =>
                    setCustomSlotForm({
                      ...customSlotForm,
                      customLessonTypeId: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">По умолчанию</option>
                  {lessonTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} - {type.pricePerHour} ₽/час
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Студент
                </label>
                <input
                  type="text"
                  value={customSlotForm.customStudentName}
                  onChange={(e) =>
                    setCustomSlotForm({
                      ...customSlotForm,
                      customStudentName: e.target.value,
                    })
                  }
                  placeholder="Оставьте пустым для значения по умолчанию"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Цена (₽)
                </label>
                <input
                  type="number"
                  value={customSlotForm.customPrice}
                  onChange={(e) =>
                    setCustomSlotForm({
                      ...customSlotForm,
                      customPrice: e.target.value,
                    })
                  }
                  placeholder="Оставьте пустым для цены по умолчанию"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleUpdateCustomSlot}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setEditingSlot(null)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Create Modal */}
      {quickCreateSlot && (
        <QuickCreateModal
          isOpen={true}
          dayIndex={quickCreateSlot.dayIndex}
          time={quickCreateSlot.time}
          lessonTypes={lessonTypes}
          students={students}
          groups={groups}
          onClose={() => setQuickCreateSlot(null)}
          onCreate={handleQuickCreate}
        />
      )}
    </div>
  );
};