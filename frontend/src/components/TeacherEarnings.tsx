import React, { useState, useEffect } from 'react';
import { api } from '../services/api';

interface LessonType {
  id: string;
  name: string;
  color: string;
  pricePerHour: number;
}

interface Student {
  id: string;
  fullName: string;
  groupId?: string | null;
  group?: { id: string; name: string } | null;
}

interface Group {
  id: string;
  name: string;
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
  // Schedule override for current week
  hasOverride?: boolean;
  overrideId?: string;
  originalDayOfWeek?: number;
  originalTime?: string;
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

const TeacherEarnings: React.FC = () => {
  // Initialize with current week (for schedule display)
  const getInitialWeekStart = () => {
    const today = new Date();
    const day = today.getDay(); // 0=Sunday, 1=Monday, etc.

    // Calculate days to subtract to get to Monday
    // If Sunday (0), go back 6 days to previous Monday
    // Otherwise, go back (day - 1) days
    const daysToSubtract = day === 0 ? 6 : day - 1;

    const monday = new Date(today);
    monday.setDate(today.getDate() - daysToSubtract);
    monday.setHours(0, 0, 0, 0);

    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const dayStr = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  const [lessonTypes, setLessonTypes] = useState<LessonType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]); // Schedule for current week
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(getInitialWeekStart());
  const [weeklyEarnings, setWeeklyEarnings] = useState<any>(null); // Earnings for current week
  const [periodEarnings, setPeriodEarnings] = useState<{ firstHalf: any; secondHalf: any }>({ firstHalf: null, secondHalf: null }); // Earnings for both periods
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [updatingSlots, setUpdatingSlots] = useState<Set<string>>(new Set());
  const [draggedSlot, setDraggedSlot] = useState<ScheduleSlot | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ dayOfWeek: number; time: string } | null>(null);
  const [quickCreateCell, setQuickCreateCell] = useState<{ dayOfWeek: number; time: string } | null>(null);

  // Form states
  const [showAddType, setShowAddType] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [editingType, setEditingType] = useState<LessonType | null>(null);
  const [editingSlot, setEditingSlot] = useState<{ slot: ScheduleSlot; weekStart: string } | null>(null);
  const [editingBaseSlot, setEditingBaseSlot] = useState<ScheduleSlot | null>(null);
  const [baseSlotForm, setBaseSlotForm] = useState({ studentId: '', groupId: '', studentName: '' });
  const [typeForm, setTypeForm] = useState({ name: '', color: '#4CAF50', pricePerHour: 0 });
  const [slotForm, setSlotForm] = useState({ selectedDays: [] as number[], time: '09:00', lessonTypeId: '', studentId: '', groupId: '', studentName: '', isRepeating: true, startTime: '09:00', endTime: '10:00' });
  const [customSlotForm, setCustomSlotForm] = useState({ customLessonTypeId: '', customStudentId: '', customGroupId: '', customStudentName: '', customPrice: '' });

  // Database uses JavaScript dayOfWeek format: 0=Sunday, 1=Monday, 2=Tuesday, etc.
  // For display in tables, we want Monday-first week
  const WEEKDAYS = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
  // Display order: Monday=1, Tuesday=2, ..., Sunday=0
  const WEEK_DISPLAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Show week starting from Monday
  const TIMES = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00', '21:00'];

  console.log('WEEK_DISPLAY_ORDER:', WEEK_DISPLAY_ORDER);
  console.log('Days in order:', WEEK_DISPLAY_ORDER.map(d => `${d}=${WEEKDAYS[d]}`));

  // Generate all possible times with 30-minute intervals
  const generateAllTimes = () => {
    const times: string[] = [];
    for (let hour = 0; hour < 24; hour++) {
      times.push(`${String(hour).padStart(2, '0')}:00`);
      times.push(`${String(hour).padStart(2, '0')}:30`);
    }
    return times;
  };
  const ALL_TIMES = generateAllTimes();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    // Load week schedule and period earnings when week changes
    if (currentWeekStart && schedule.length > 0) {
      loadWeekSchedule();
      loadPeriodEarnings(currentWeekStart);
    }
  }, [currentWeekStart]);

  // Pre-fill form when opening quick create modal
  useEffect(() => {
    if (quickCreateCell) {
      const startTime = quickCreateCell.time;
      // Calculate end time (1 hour later)
      const [hours, minutes] = startTime.split(':').map(Number);
      const endHour = hours + 1;
      const endTime = `${String(endHour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

      setSlotForm({
        selectedDays: [quickCreateCell.dayOfWeek],
        time: quickCreateCell.time,
        lessonTypeId: '',
        studentId: '',
        groupId: '',
        studentName: '',
        isRepeating: true,
        startTime: startTime,
        endTime: endTime
      });
    }
  }, [quickCreateCell]);

  const formatWeekDisplay = (weekStart: string) => {
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);

    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const monthName = startDate.toLocaleDateString('ru-RU', { month: 'long' });
    const year = startDate.getFullYear();

    // Check if both dates are in the same month
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDay}-${endDay} ${monthName} ${year} г.`;
    } else {
      // Different months
      const endMonthName = endDate.toLocaleDateString('ru-RU', { month: 'long' });
      return `${startDay} ${monthName} - ${endDay} ${endMonthName} ${year} г.`;
    }
  };

  const loadPeriodEarnings = async (weekStart?: string) => {
    try {
      // Use the provided weekStart or currentWeekStart to determine the month
      const dateToUse = weekStart || currentWeekStart;
      const [year, month] = dateToUse.split('-');

      // Get earnings for first half (1-15)
      // Use day 1 for period request with explicit isPeriod=true parameter
      const firstHalfStart = `${year}-${month}-01`;
      const firstHalfEarnings = await api.getWeekEarnings(firstHalfStart, true);

      // Get earnings for second half (16-end)
      // Use day 16 for period request with explicit isPeriod=true parameter
      const secondHalfStart = `${year}-${month}-16`;
      const secondHalfEarnings = await api.getWeekEarnings(secondHalfStart, true);

      setPeriodEarnings({
        firstHalf: firstHalfEarnings,
        secondHalf: secondHalfEarnings
      });
    } catch (error) {
      console.error('Error loading period earnings:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [typesData, scheduleData, studentsData, groupsData] = await Promise.all([
        api.getLessonTypes(),
        api.getPersonalSchedule(),
        api.getStudents(),
        api.getGroups()
      ]);

      setLessonTypes(typesData);
      setSchedule(scheduleData);
      setStudents(studentsData);
      setGroups(groupsData);

      // Set current week
      const weekStart = getInitialWeekStart();
      setCurrentWeekStart(weekStart);

      // Load week schedule with completed lessons and weekly earnings
      try {
        const scheduleWithCompleted = await api.getCompletedLessons(weekStart);
        setSchedule(scheduleWithCompleted);

        const weekEarnings = await api.getWeekEarnings(weekStart);
        setWeeklyEarnings(weekEarnings);
      } catch (error) {
        console.error('Error loading initial week schedule:', error);
      }

      // Load period earnings
      loadPeriodEarnings();
    } catch (error) {
      console.error('Error loading data:', error);
      alert('Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  const loadWeekSchedule = async () => {
    try {
      // Load schedule with completed lessons for current week
      const scheduleData = await api.getCompletedLessons(currentWeekStart);
      setSchedule(scheduleData);

      // Load earnings for current week
      const earnings = await api.getWeekEarnings(currentWeekStart);
      setWeeklyEarnings(earnings);
    } catch (error) {
      console.error('Error loading week schedule:', error);
    }
  };

  const handleCreateType = async () => {
    try {
      await api.createLessonType(typeForm);
      setTypeForm({ name: '', color: '#4CAF50', pricePerHour: 0 });
      setShowAddType(false);
      loadData();
    } catch (error) {
      console.error('Error creating lesson type:', error);
      alert('Ошибка создания типа урока');
    }
  };

  const handleUpdateType = async () => {
    if (!editingType) return;
    try {
      await api.updateLessonType(editingType.id, {
        name: typeForm.name,
        color: typeForm.color,
        pricePerHour: typeForm.pricePerHour
      });
      setTypeForm({ name: '', color: '#4CAF50', pricePerHour: 0 });
      setEditingType(null);
      loadData();
    } catch (error) {
      console.error('Error updating lesson type:', error);
      alert('Ошибка обновления типа урока');
    }
  };

  const handleDeleteType = async (id: string) => {
    if (!confirm('Удалить этот тип урока?')) return;
    try {
      await api.deleteLessonType(id);
      loadData();
    } catch (error) {
      console.error('Error deleting lesson type:', error);
      alert('Ошибка удаления типа урока');
    }
  };

  // Auto-reload schedule data when week changes
  useEffect(() => {
    if (currentWeekStart) {
      loadWeekSchedule();
    }
  }, [currentWeekStart]);

  const handleCreateSlot = async () => {
    if (!slotForm.lessonTypeId) {
      alert('Выберите тип урока');
      return;
    }
    if (slotForm.isRepeating && slotForm.selectedDays.length === 0) {
      alert('Выберите хотя бы один день недели');
      return;
    }
    try {
      if (slotForm.isRepeating) {
        // Create a recurring slot for each selected day
        const promises = slotForm.selectedDays.map(dayOfWeek =>
          api.createScheduleSlot({
            dayOfWeek,
            time: slotForm.startTime,
            lessonTypeId: slotForm.lessonTypeId,
            studentId: slotForm.studentId || undefined,
            groupId: slotForm.groupId || undefined,
            studentName: slotForm.studentName || undefined
          })
        );
        await Promise.all(promises);
      } else {
        // Create a one-time slot for the clicked day only
        // We'll use schedule override for the current week
        await api.createScheduleSlot({
          dayOfWeek: quickCreateCell!.dayOfWeek,
          time: slotForm.startTime,
          lessonTypeId: slotForm.lessonTypeId,
          studentId: slotForm.studentId || undefined,
          groupId: slotForm.groupId || undefined,
          studentName: slotForm.studentName || undefined
        });
      }
      setSlotForm({ selectedDays: [], time: '09:00', lessonTypeId: '', studentId: '', groupId: '', studentName: '', isRepeating: true, startTime: '09:00', endTime: '10:00' });
      setShowAddSlot(false);
      setQuickCreateCell(null);
      loadData();
    } catch (error) {
      console.error('Error creating schedule slot:', error);
      alert('Ошибка добавления урока в расписание');
    }
  };

  const handleDeleteSlot = async (id: string) => {
    if (!confirm('Удалить этот урок из расписания?')) return;
    try {
      await api.deleteScheduleSlot(id);
      loadData();
    } catch (error) {
      console.error('Error deleting schedule slot:', error);
      alert('Ошибка удаления урока');
    }
  };

  const handleEditSlot = (slot: ScheduleSlot, weekStart: string) => {
    const lesson = slot.completedLessons.find(l => l.weekStart === weekStart);
    setEditingSlot({ slot, weekStart });
    setCustomSlotForm({
      customLessonTypeId: lesson?.customLessonTypeId || '',
      customStudentId: lesson?.customStudentId || slot.studentId || '',
      customGroupId: lesson?.customGroupId || slot.groupId || '',
      customStudentName: lesson?.customStudentName || slot.studentName || '',
      customPrice: lesson?.customPrice?.toString() || ''
    });
  };

  const handleSaveCustomSlot = async () => {
    if (!editingSlot) return;
    try {
      const lesson = editingSlot.slot.completedLessons.find(l => l.weekStart === editingSlot.weekStart);

      await api.updateCompletedLesson(
        editingSlot.slot.id,
        editingSlot.weekStart,
        {
          completed: lesson?.completed || false,
          paid: lesson?.paid || false,
          customPrice: customSlotForm.customPrice ? parseFloat(customSlotForm.customPrice) : null,
          customStudentName: customSlotForm.customStudentName || null,
          customStudentId: customSlotForm.customStudentId || null,
          customGroupId: customSlotForm.customGroupId || null,
          customLessonTypeId: customSlotForm.customLessonTypeId || null
        }
      );

      setEditingSlot(null);
      setCustomSlotForm({ customLessonTypeId: '', customStudentId: '', customGroupId: '', customStudentName: '', customPrice: '' });
      loadData();
    } catch (error) {
      console.error('Error updating custom slot data:', error);
      alert('Ошибка обновления урока');
    }
  };

  const handleOpenBaseSlotEdit = (slot: ScheduleSlot) => {
    setEditingBaseSlot(slot);
    setBaseSlotForm({
      studentId: slot.studentId || '',
      groupId: slot.groupId || '',
      studentName: slot.student?.fullName || slot.studentName || '',
    });
  };

  const handleSaveBaseSlot = async () => {
    if (!editingBaseSlot) return;
    try {
      await api.updateScheduleSlot(editingBaseSlot.id, {
        studentId: baseSlotForm.studentId || undefined,
        groupId: baseSlotForm.groupId || undefined,
        studentName: baseSlotForm.studentName || undefined,
      });
      setEditingBaseSlot(null);
      setBaseSlotForm({ studentId: '', groupId: '', studentName: '' });
      loadData();
    } catch (error) {
      console.error('Error updating base slot:', error);
      alert('Ошибка обновления');
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, slot: ScheduleSlot) => {
    setDraggedSlot(slot);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dayOfWeek: number, time: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverCell({ dayOfWeek, time });
  };

  const handleDragLeave = () => {
    setDragOverCell(null);
  };

  const handleDrop = async (e: React.DragEvent, dayOfWeek: number, time: string) => {
    e.preventDefault();
    setDragOverCell(null);

    if (!draggedSlot) return;

    // Check if dropping on the same cell (compare with current position, which may be overridden)
    if (draggedSlot.dayOfWeek === dayOfWeek && draggedSlot.time === time) {
      setDraggedSlot(null);
      return;
    }

    // Check if target cell already has a slot
    const targetSlot = getSlotForCell(dayOfWeek, time);
    if (targetSlot) {
      alert('В этой ячейке уже есть урок!');
      setDraggedSlot(null);
      return;
    }

    try {
      // Create a week-specific override instead of modifying the base schedule
      await api.createScheduleOverride({
        scheduleSlotId: draggedSlot.id,
        weekStart: currentWeekStart,
        newDayOfWeek: dayOfWeek,
        newTime: time
      });
      loadData();
    } catch (error) {
      console.error('Error creating schedule override:', error);
      alert('Ошибка при создании переопределения расписания');
    } finally {
      setDraggedSlot(null);
    }
  };

  const handleLessonClick = async (slot: ScheduleSlot) => {
    // Prevent multiple simultaneous clicks on the same slot
    if (updatingSlots.has(slot.id)) {
      return;
    }

    // Mark this slot as being updated
    setUpdatingSlots(prev => new Set(prev).add(slot.id));

    try {
      const completedLessons = Array.isArray(slot.completedLessons) ? slot.completedLessons : [];
      // Find the completed lesson for the CURRENT week, not just the first one
      const completed = completedLessons.find(cl => cl.weekStart === currentWeekStart);

      // Cycle through states: not completed -> completed (not paid) -> completed and paid -> not completed
      let newCompleted = false;
      let newPaid = false;

      if (!completed?.completed) {
        // State 1: Not completed -> Mark as completed (not paid)
        newCompleted = true;
        newPaid = false;
      } else if (completed.completed && !completed.paid) {
        // State 2: Completed (not paid) -> Mark as paid
        newCompleted = true;
        newPaid = true;
      } else {
        // State 3: Completed and paid -> Reset to not completed
        newCompleted = false;
        newPaid = false;
      }

      // OPTIMISTIC UPDATE: Update UI immediately before API call
      const updatedSchedule = schedule.map(s => {
        if (s.id === slot.id) {
          return {
            ...s,
            completedLessons: [{
              id: completed?.id || 'temp-id',
              weekStart: currentWeekStart,
              completed: newCompleted,
              paid: newPaid
            }]
          };
        }
        return s;
      });
      setSchedule(updatedSchedule);

      // Update weekly earnings optimistically
      if (weeklyEarnings) {
        const pricePerHour = slot.lessonType.pricePerHour || 0;
        let completedDelta = 0;
        let paidDelta = 0;
        let earningsDelta = 0;

        if (!completed?.completed && newCompleted) {
          completedDelta = 1;
          if (newPaid) {
            paidDelta = 1;
            earningsDelta = pricePerHour;
          }
        } else if (completed?.completed && !completed.paid && newPaid) {
          paidDelta = 1;
          earningsDelta = pricePerHour;
        } else if (completed?.completed && completed.paid && !newCompleted) {
          completedDelta = -1;
          paidDelta = -1;
          earningsDelta = -pricePerHour;
        }

        setWeeklyEarnings({
          ...weeklyEarnings,
          completedCount: weeklyEarnings.completedCount + completedDelta,
          paidCount: weeklyEarnings.paidCount + paidDelta,
          totalEarnings: weeklyEarnings.totalEarnings + earningsDelta
        });
      }

      // Send to server
      await api.markLessonCompleted({
        scheduleSlotId: slot.id,
        weekStart: currentWeekStart,
        completed: newCompleted,
        paid: newPaid
      });
      // Success - UI already updated optimistically, reload period earnings
      loadPeriodEarnings();
    } catch (error) {
      console.error('Error updating lesson status:', error);
      alert('Ошибка обновления статуса урока');
      // Revert optimistic update on error
      loadWeekSchedule();
      loadPeriodEarnings();
    } finally {
      // Remove this slot from updating set
      setUpdatingSlots(prev => {
        const newSet = new Set(prev);
        newSet.delete(slot.id);
        return newSet;
      });
    }
  };

  const changeWeek = (direction: number) => {
    const date = new Date(currentWeekStart);
    date.setDate(date.getDate() + direction * 7);

    // Normalize to Monday
    const day = date.getDay(); // 0=Sunday, 1=Monday, etc.
    const daysToSubtract = day === 0 ? 6 : day - 1;
    date.setDate(date.getDate() - daysToSubtract);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    setCurrentWeekStart(`${year}-${month}-${dayStr}`);
  };

  const getSlotForCell = (dayOfWeek: number, time: string): ScheduleSlot | undefined => {
    return schedule.find(s => s.dayOfWeek === dayOfWeek && s.time === time);
  };

  // Calculate earnings by lesson type for the current week
  const getEarningsByLessonType = () => {
    const statsByType: { [key: string]: { name: string; color: string; completed: number; paid: number; earnings: number; price: number } } = {};

    console.log('[getEarningsByLessonType] Calculating stats for week:', currentWeekStart);
    console.log('[getEarningsByLessonType] Schedule slots count:', schedule.length);

    // Use schedule which contains lessons for the current week
    schedule.forEach(slot => {
      const lessonType = slot.lessonType;
      if (!statsByType[lessonType.id]) {
        statsByType[lessonType.id] = {
          name: lessonType.name,
          color: lessonType.color,
          completed: 0,
          paid: 0,
          earnings: 0,
          price: lessonType.pricePerHour
        };
      }

      const completedLessons = Array.isArray(slot.completedLessons) ? slot.completedLessons : [];
      // Find the completed lesson for the CURRENT week, not just the first one
      const completed = completedLessons.find(cl => cl.weekStart === currentWeekStart);

      if (completed?.completed) {
        console.log(`  [${lessonType.name}] Slot ${slot.id}: completed=${completed.completed}, paid=${completed.paid}, price=${lessonType.pricePerHour}`);
        statsByType[lessonType.id].completed += 1;
        if (completed.paid) {
          statsByType[lessonType.id].paid += 1;
          statsByType[lessonType.id].earnings += lessonType.pricePerHour;
        }
      }
    });

    console.log('[getEarningsByLessonType] Final stats:', statsByType);
    return Object.values(statsByType);
  };

  const inputStyle: React.CSSProperties = {
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
    padding: '0.5rem 0.75rem',
    fontSize: '0.875rem',
    width: '100%',
    backgroundColor: 'white',
    color: '#334155',
    outline: 'none',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 flex items-center justify-center">
        <p className="text-slate-400 text-sm">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      {/* Main glass card */}
      <div className="bg-white/70 backdrop-blur-xl border border-white/60 rounded-3xl p-6"
           style={{ boxShadow: '0 35px 90px -45px rgba(0,0,0,0.30)' }}>

        {/* Top header row: title + settings button */}
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-bold text-slate-800 m-0">💰 Расписание</h2>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 border border-slate-200/60 shadow-sm hover:bg-slate-50 transition text-sm font-semibold text-slate-600"
          >
            {showSettings ? 'Скрыть настройки' : '⚙️ Настройки'}
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3 mt-0">Типы уроков</h3>

            <div className="flex flex-wrap gap-2 mb-4">
              {lessonTypes.map(type => (
                <div
                  key={type.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-white text-sm font-medium"
                  style={{ backgroundColor: type.color }}
                >
                  <span className="font-semibold">{type.name}</span>
                  <span className="opacity-80">· {type.pricePerHour}₽/час</span>
                  <button
                    onClick={() => {
                      setEditingType(type);
                      setTypeForm({ name: type.name, color: type.color, pricePerHour: type.pricePerHour });
                    }}
                    className="ml-1 bg-white/30 hover:bg-white/50 border-none text-white rounded-md px-1.5 py-0.5 text-xs cursor-pointer transition"
                    title="Редактировать"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => handleDeleteType(type.id)}
                    className="bg-white/30 hover:bg-white/50 border-none text-white rounded-md px-1.5 py-0.5 text-xs cursor-pointer transition"
                    title="Удалить"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Edit Type Form */}
            {editingType && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-4">
                <h4 className="text-sm font-bold text-amber-800 mb-3 mt-0">✎ Редактирование типа урока</h4>
                <div className="grid gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Название (например: Школа №1)"
                    value={typeForm.name}
                    onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                    style={inputStyle}
                  />
                  <div className="flex gap-3 items-center flex-wrap">
                    <label className="text-xs font-semibold text-slate-600">Цвет:</label>
                    <input
                      type="color"
                      value={typeForm.color}
                      onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })}
                      className="w-10 h-8 cursor-pointer rounded border-none"
                    />
                    <label className="text-xs font-semibold text-slate-600">Цена за час:</label>
                    <input
                      type="number"
                      value={typeForm.pricePerHour}
                      onChange={(e) => setTypeForm({ ...typeForm, pricePerHour: parseFloat(e.target.value) || 0 })}
                      style={{ ...inputStyle, width: '100px' }}
                    />
                    <span className="text-sm text-slate-500">₽</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleUpdateType} className="px-4 py-1.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold shadow-sm hover:bg-emerald-600 transition">
                    Сохранить изменения
                  </button>
                  <button onClick={() => {
                    setEditingType(null);
                    setTypeForm({ name: '', color: '#4CAF50', pricePerHour: 0 });
                  }} className="px-4 py-1.5 rounded-xl bg-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-300 transition">
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {!showAddType && !editingType ? (
              <button
                onClick={() => setShowAddType(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-500 text-white shadow-md hover:bg-emerald-600 transition text-sm font-semibold"
              >
                + Добавить тип урока
              </button>
            ) : !editingType ? (
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h4 className="text-sm font-bold text-slate-700 mb-3 mt-0">Новый тип урока</h4>
                <div className="grid gap-3 mb-3">
                  <input
                    type="text"
                    placeholder="Название (например: Школа №1)"
                    value={typeForm.name}
                    onChange={(e) => setTypeForm({ ...typeForm, name: e.target.value })}
                    style={inputStyle}
                  />
                  <div className="flex gap-3 items-center flex-wrap">
                    <label className="text-xs font-semibold text-slate-600">Цвет:</label>
                    <input
                      type="color"
                      value={typeForm.color}
                      onChange={(e) => setTypeForm({ ...typeForm, color: e.target.value })}
                      className="w-10 h-8 cursor-pointer rounded border-none"
                    />
                    <label className="text-xs font-semibold text-slate-600">Цена за час:</label>
                    <input
                      type="number"
                      value={typeForm.pricePerHour}
                      onChange={(e) => setTypeForm({ ...typeForm, pricePerHour: parseFloat(e.target.value) || 0 })}
                      style={{ ...inputStyle, width: '100px' }}
                    />
                    <span className="text-sm text-slate-500">₽</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreateType} className="px-4 py-1.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold shadow-sm hover:bg-emerald-600 transition">
                    Сохранить
                  </button>
                  <button onClick={() => setShowAddType(false)} className="px-4 py-1.5 rounded-xl bg-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-300 transition">
                    Отмена
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* Week Navigator */}
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between bg-white/60 backdrop-blur-xl border border-white/60 rounded-2xl px-4 py-3 shadow-sm mb-5">
          <button
            onClick={() => changeWeek(-1)}
            className="px-4 py-2 rounded-xl bg-white/70 border border-slate-200/60 shadow-sm hover:bg-blue-50 transition text-sm font-semibold text-slate-600"
          >
            ← Предыдущая
          </button>

          <div className="text-center">
            <div className="text-slate-800 font-semibold text-sm">
              📅 {formatWeekDisplay(currentWeekStart)}
            </div>
            {weeklyEarnings && (
              <div className="mt-1 text-sm text-slate-600">
                Заработано: <span className="font-bold text-emerald-600">{weeklyEarnings.totalEarnings}₽</span>
                <span className="text-slate-400 ml-1.5">({weeklyEarnings.paidCount} из {weeklyEarnings.totalLessons} оплачено)</span>
              </div>
            )}
          </div>

          <button
            onClick={() => changeWeek(1)}
            className="px-4 py-2 rounded-xl bg-white/70 border border-slate-200/60 shadow-sm hover:bg-blue-50 transition text-sm font-semibold text-slate-600"
          >
            Следующая →
          </button>
        </div>

        {/* Action buttons: Add lesson + (settings already above) */}
        <div className="flex gap-2 mb-5">
          {!showAddSlot && lessonTypes.length > 0 && (
            <button
              onClick={() => setShowAddSlot(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white shadow-md hover:scale-[1.02] transition text-sm font-semibold"
            >
              + Добавить урок
            </button>
          )}
        </div>

        {/* Add Slot Form */}
        {showAddSlot && (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mb-5">
            <h4 className="text-sm font-semibold text-slate-700 mt-0 mb-3">Добавить урок</h4>

            {/* Days Selection */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-600 mb-2">Выберите дни недели:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {WEEKDAYS.map((day, i) => (
                  <label
                    key={i}
                    className={[
                      'flex items-center gap-2 px-3 py-2 rounded-xl border cursor-pointer transition text-sm',
                      slotForm.selectedDays.includes(i)
                        ? 'bg-blue-50 border-blue-400 text-blue-700 font-semibold'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    ].join(' ')}
                  >
                    <input
                      type="checkbox"
                      checked={slotForm.selectedDays.includes(i)}
                      onChange={(e) => {
                        const newDays = e.target.checked
                          ? [...slotForm.selectedDays, i]
                          : slotForm.selectedDays.filter(d => d !== i);
                        setSlotForm({ ...slotForm, selectedDays: newDays.sort() });
                      }}
                      className="rounded"
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Время</label>
                <select value={slotForm.time} onChange={(e) => setSlotForm({ ...slotForm, time: e.target.value })} style={inputStyle}>
                  {TIMES.map(time => (<option key={time} value={time}>{time}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Тип урока</label>
                <select value={slotForm.lessonTypeId} onChange={(e) => setSlotForm({ ...slotForm, lessonTypeId: e.target.value })} style={inputStyle}>
                  <option value="">Выберите тип</option>
                  {lessonTypes.map(type => (<option key={type.id} value={type.id}>{type.name}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">Ученик / Группа</label>
                <select
                  value={slotForm.studentId ? `s:${slotForm.studentId}` : slotForm.groupId ? `g:${slotForm.groupId}` : ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) {
                      setSlotForm({ ...slotForm, studentId: '', groupId: '' });
                    } else if (val.startsWith('s:')) {
                      setSlotForm({ ...slotForm, studentId: val.slice(2), groupId: '' });
                    } else if (val.startsWith('g:')) {
                      setSlotForm({ ...slotForm, groupId: val.slice(2), studentId: '' });
                    }
                  }}
                  style={inputStyle}
                >
                  <option value="">Не выбран</option>
                  {students.filter(s => !s.groupId && !s.group).length > 0 && (
                    <optgroup label="── Индивидуальные ──">
                      {students.filter(s => !s.groupId && !s.group).map(student => (
                        <option key={student.id} value={`s:${student.id}`}>{student.fullName}</option>
                      ))}
                    </optgroup>
                  )}
                  {groups.length > 0 && (
                    <optgroup label="── Группы ──">
                      {groups.map(group => (
                        <option key={group.id} value={`g:${group.id}`}>{group.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>
            </div>

            {slotForm.selectedDays.length > 0 && (
              <div className="mt-3 mb-3 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl">
                <span className="text-sm font-semibold text-slate-700">Будет создано уроков: {slotForm.selectedDays.length}</span>
                <div className="mt-0.5 text-xs text-slate-500">
                  {slotForm.selectedDays.map(d => WEEKDAYS[d]).join(', ')} в {slotForm.time}
                  {slotForm.studentId && ` · ${students.find(s => s.id === slotForm.studentId)?.fullName}`}
                  {slotForm.groupId && ` · ${groups.find(g => g.id === slotForm.groupId)?.name}`}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-3">
              <button onClick={handleCreateSlot} className="px-4 py-1.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold shadow-sm hover:bg-emerald-600 transition">
                ✓ Добавить {slotForm.selectedDays.length > 0 ? `(${slotForm.selectedDays.length})` : ''}
              </button>
              <button
                onClick={() => {
                  setShowAddSlot(false);
                  setQuickCreateCell(null);
                }}
                className="px-4 py-1.5 rounded-xl bg-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-300 transition"
              >
                Отмена
              </button>
            </div>
          </div>
        )}

        {/* Schedule Grid */}
        <div className="overflow-x-auto rounded-3xl border border-white/60 shadow-sm">
          <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: '1100px' }}>
            <thead>
              <tr className="bg-slate-50/80">
                <th className="sticky left-0 z-20 bg-slate-50/90 backdrop-blur px-4 py-3 text-xs font-semibold text-slate-600 border-b border-slate-200/60 border-r border-slate-200/60 text-left"
                    style={{ minWidth: '80px' }}>
                  Время
                </th>
                {WEEK_DISPLAY_ORDER.map((dayOfWeek) => (
                  <th key={dayOfWeek} className="px-3 py-3 text-center text-sm font-semibold text-slate-700 border-b border-slate-200/60 border-r border-slate-200/40 bg-slate-50/80"
                      style={{ minWidth: '120px' }}>
                    {WEEKDAYS[dayOfWeek]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIMES.map(time => (
                <tr key={time}>
                  <td className="sticky left-0 z-10 bg-white/85 backdrop-blur px-4 py-4 text-sm font-medium text-slate-700 border-b border-slate-200/50 border-r border-slate-200/60">
                    {time}
                  </td>
                  {WEEK_DISPLAY_ORDER.map((dayOfWeek) => {
                    const slot = getSlotForCell(dayOfWeek, time);
                    const completedLessons = slot && Array.isArray(slot.completedLessons) ? slot.completedLessons : [];
                    const completed = completedLessons.find(cl => cl.weekStart === currentWeekStart);
                    const isUpdating = slot && updatingSlots.has(slot.id);

                    // Determine card style based on status
                    let cardBg = 'bg-slate-100/60';
                    let cardBorder = 'border-slate-200/40';
                    let cardText = 'text-slate-500';
                    let statusBadgeText = '';
                    let statusBadgeBg = 'bg-white/70';
                    let statusBadgeBorder = 'border-white/60';

                    if (slot) {
                      if (completed?.completed && completed?.paid) {
                        cardBg = 'bg-emerald-500/15';
                        cardBorder = 'border-emerald-500/30';
                        cardText = 'text-emerald-900';
                        statusBadgeText = '💰 Оплачен';
                        statusBadgeBg = 'bg-emerald-100/80';
                        statusBadgeBorder = 'border-emerald-200/60';
                      } else if (completed?.completed) {
                        cardBg = 'bg-blue-500/12';
                        cardBorder = 'border-blue-500/25';
                        cardText = 'text-blue-900';
                        statusBadgeText = '✓ Прошел';
                        statusBadgeBg = 'bg-blue-100/80';
                        statusBadgeBorder = 'border-blue-200/60';
                      } else {
                        cardBg = 'bg-rose-500/10';
                        cardBorder = 'border-rose-500/20';
                        cardText = 'text-rose-900';
                        statusBadgeText = '○ Не прошел';
                        statusBadgeBg = 'bg-rose-100/70';
                        statusBadgeBorder = 'border-rose-200/60';
                      }
                    }

                    const isDragOver = dragOverCell?.dayOfWeek === dayOfWeek && dragOverCell?.time === time;

                    return (
                      <td
                        key={dayOfWeek}
                        className={`relative h-16 px-2 py-2 align-top border-b border-slate-200/50 border-r border-slate-200/40 transition-colors ${
                          isDragOver ? 'bg-blue-100 ring-2 ring-blue-400 ring-inset' : 'hover:bg-blue-50/40'
                        }`}
                        onDragOver={(e) => handleDragOver(e, dayOfWeek, time)}
                        onDragLeave={handleDragLeave}
                        onDrop={(e) => handleDrop(e, dayOfWeek, time)}
                      >
                        {slot ? (
                          <div
                            className="group relative"
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, slot)}
                            style={{ cursor: 'grab' }}
                          >
                            {/* Event card */}
                            <div className={`rounded-2xl px-3 py-2 ${cardBg} border ${cardBorder} ${cardText} shadow-sm`}>
                              <div className="font-semibold text-sm leading-tight">
                                {slot.student?.fullName || slot.studentName || 'Ученик'}
                                {(completed?.customLessonTypeId || (completed?.customPrice !== null && completed?.customPrice !== undefined)) && (
                                  <span className="ml-1 text-xs opacity-60" title="Изменено для этой недели">✎</span>
                                )}
                                {/* Override indicator - lesson moved to different day/time */}
                                {slot.hasOverride && (
                                  <span className="ml-1 text-xs opacity-70" title={`Перенесено с ${WEEKDAYS[slot.originalDayOfWeek!]} ${slot.originalTime}`}>
                                    📌
                                  </span>
                                )}
                              </div>
                              {completed?.customPrice !== undefined && completed?.customPrice !== null && (
                                <div className="text-xs opacity-75 mt-0.5">
                                  {completed.customPrice}₽
                                </div>
                              )}
                              {/* Status badge — clickable */}
                              <button
                                onClick={() => handleLessonClick(slot)}
                                disabled={isUpdating}
                                className={`mt-1.5 inline-flex items-center gap-1 rounded-full ${statusBadgeBg} border ${statusBadgeBorder} px-2 py-0.5 text-xs text-slate-700 cursor-pointer hover:opacity-80 transition disabled:opacity-50 disabled:cursor-wait`}
                              >
                                {isUpdating ? '⏳ ...' : statusBadgeText}
                              </button>
                            </div>
                            {/* Return to original position button - only show if lesson is overridden */}
                            {slot.hasOverride && (
                              <button
                                onClick={async () => {
                                  try {
                                    await api.deleteScheduleOverrideBySlotAndWeek(slot.id, currentWeekStart);
                                    loadData();
                                  } catch (error) {
                                    console.error('Error removing override:', error);
                                    alert('Ошибка при возврате урока');
                                  }
                                }}
                                className="absolute top-1.5 right-[77px] opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-orange-600 text-xs w-5 h-5 flex items-center justify-center rounded-lg hover:bg-orange-50"
                                title="Вернуть на исходное место"
                              >
                                ↩️
                              </button>
                            )}
                            {/* Link student/group permanently */}
                            <button
                              onClick={() => handleOpenBaseSlotEdit(slot)}
                              className="absolute top-1.5 right-[52px] opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-violet-600 text-xs w-5 h-5 flex items-center justify-center rounded-lg hover:bg-violet-50"
                              title="Привязать ученика / группу"
                            >
                              👤
                            </button>
                            {/* Edit button for this week */}
                            <button
                              onClick={() => handleEditSlot(slot, currentWeekStart)}
                              className="absolute top-1.5 right-7 opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-blue-600 text-xs w-5 h-5 flex items-center justify-center rounded-lg hover:bg-blue-50"
                              title="Изменить для этой недели"
                            >
                              ✎
                            </button>
                            {/* Delete button — appears on hover */}
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition text-slate-400 hover:text-red-600 text-xs w-5 h-5 flex items-center justify-center rounded-lg hover:bg-red-50"
                              title="Удалить из расписания"
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <div
                            className="flex items-center justify-center h-full text-slate-300 text-sm cursor-pointer hover:bg-blue-100 hover:text-blue-500 transition rounded-lg"
                            onClick={() => setQuickCreateCell({ dayOfWeek, time })}
                            title="Нажмите для создания занятия"
                          >
                            +
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Edit Slot Modal/Form */}
        {editingSlot && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 mb-4">
                ✎ Изменить урок для этой недели
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                Неделя: {formatWeekDisplay(editingSlot.weekStart)}
              </p>

              <div className="space-y-4">
                {/* Lesson Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Тип урока
                  </label>
                  <select
                    value={customSlotForm.customLessonTypeId}
                    onChange={(e) => setCustomSlotForm({ ...customSlotForm, customLessonTypeId: e.target.value })}
                    style={inputStyle}
                  >
                    <option value="">По умолчанию ({editingSlot.slot.lessonType.name})</option>
                    {lessonTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name} — {type.pricePerHour}₽/час
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Price */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                    Кастомная цена
                  </label>
                  <input
                    type="number"
                    placeholder={`По умолчанию: ${editingSlot.slot.lessonType.pricePerHour}₽`}
                    value={customSlotForm.customPrice}
                    onChange={(e) => setCustomSlotForm({ ...customSlotForm, customPrice: e.target.value })}
                    style={inputStyle}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Оставьте пустым, чтобы использовать цену типа урока
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleSaveCustomSlot}
                  className="flex-1 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold shadow-sm hover:bg-emerald-600 transition"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => {
                    setEditingSlot(null);
                    setCustomSlotForm({ customLessonTypeId: '', customStudentName: '', customPrice: '' });
                  }}
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-300 transition"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Base Slot Modal — permanent student/group link */}
        {editingBaseSlot && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
              <h3 className="text-lg font-bold text-slate-800 mb-1">
                Привязать ученика / группу
              </h3>
              <p className="text-sm text-slate-500 mb-4">
                Изменение применится ко всем неделям постоянно
              </p>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Имя в расписании</label>
                  <input
                    type="text"
                    value={baseSlotForm.studentName}
                    onChange={(e) => setBaseSlotForm(f => ({ ...f, studentName: e.target.value }))}
                    placeholder="Как отображается в расписании"
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1.5">Привязать к ученику / группе (необязательно)</label>
                  <select
                    value={baseSlotForm.studentId ? `s:${baseSlotForm.studentId}` : baseSlotForm.groupId ? `g:${baseSlotForm.groupId}` : ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (!val) {
                        setBaseSlotForm(f => ({ ...f, studentId: '', groupId: '' }));
                      } else if (val.startsWith('s:')) {
                        const sid = val.slice(2);
                        const stu = students.find(s => s.id === sid);
                        setBaseSlotForm(f => ({ ...f, studentId: sid, groupId: '', studentName: stu?.fullName || f.studentName }));
                      } else if (val.startsWith('g:')) {
                        const gid = val.slice(2);
                        const grp = groups.find(g => g.id === gid);
                        setBaseSlotForm(f => ({ ...f, groupId: gid, studentId: '', studentName: grp?.name || f.studentName }));
                      }
                    }}
                    className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                  >
                    <option value="">Не привязан</option>
                    {students.length > 0 && (
                      <optgroup label="── Индивидуальные ──">
                        {students.map(s => (
                          <option key={s.id} value={`s:${s.id}`}>{s.fullName}</option>
                        ))}
                      </optgroup>
                    )}
                    {groups.length > 0 && (
                      <optgroup label="── Группы ──">
                        {groups.map(g => (
                          <option key={g.id} value={`g:${g.id}`}>{g.name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button
                  onClick={handleSaveBaseSlot}
                  className="flex-1 px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-semibold shadow-sm hover:bg-violet-600 transition"
                >
                  Сохранить
                </button>
                <button
                  onClick={() => setEditingBaseSlot(null)}
                  className="flex-1 px-4 py-2 rounded-xl bg-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-300 transition"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Quick Create Modal */}
        {quickCreateCell && (
          <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 pt-8 overflow-y-auto">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl my-4">
              <h3 className="text-xl font-bold text-slate-800 mb-1">
                ➕ Создать занятие
              </h3>
              <p className="text-sm text-slate-500 mb-5">
                {WEEKDAYS[quickCreateCell.dayOfWeek]} в {quickCreateCell.time}
              </p>

              <div className="space-y-4">
                {/* Repeating Checkbox */}
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200">
                  <input
                    type="checkbox"
                    id="isRepeating"
                    checked={slotForm.isRepeating}
                    onChange={(e) => setSlotForm({ ...slotForm, isRepeating: e.target.checked, selectedDays: e.target.checked ? slotForm.selectedDays : [] })}
                    className="rounded w-4 h-4"
                  />
                  <label htmlFor="isRepeating" className="text-sm font-semibold text-slate-700 cursor-pointer">
                    Повторяющееся занятие
                  </label>
                </div>

                {/* Days Selection - only show if repeating */}
                {slotForm.isRepeating && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Выберите дни недели
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {WEEKDAYS_DISPLAY.map((day, i) => (
                        <label
                          key={i}
                          className={[
                            'flex items-center gap-2 px-3 py-2.5 rounded-xl border cursor-pointer transition text-sm font-medium',
                            slotForm.selectedDays.includes(i)
                              ? 'bg-blue-50 border-blue-400 text-blue-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                          ].join(' ')}
                        >
                          <input
                            type="checkbox"
                            checked={slotForm.selectedDays.includes(i)}
                            onChange={(e) => {
                              const newDays = e.target.checked
                                ? [...slotForm.selectedDays, i]
                                : slotForm.selectedDays.filter(d => d !== i);
                              setSlotForm({ ...slotForm, selectedDays: newDays.sort() });
                            }}
                            className="rounded"
                          />
                          {day}
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Time Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Начало
                    </label>
                    <select
                      value={slotForm.startTime}
                      onChange={(e) => {
                        const newStartTime = e.target.value;
                        setSlotForm({ ...slotForm, startTime: newStartTime, time: newStartTime });
                      }}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ALL_TIMES.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Окончание
                    </label>
                    <select
                      value={slotForm.endTime}
                      onChange={(e) => setSlotForm({ ...slotForm, endTime: e.target.value })}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {ALL_TIMES.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Lesson Type */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Тип урока
                  </label>
                  <select
                    value={slotForm.lessonTypeId}
                    onChange={(e) => setSlotForm({ ...slotForm, lessonTypeId: e.target.value })}
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Выберите тип урока</option>
                    {lessonTypes.map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name} — {type.pricePerHour}₽/час
                      </option>
                    ))}
                  </select>
                </div>

                {/* Student/Group */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    {slotForm.isRepeating ? 'Ученик / Группа' : 'Имя ученика'}
                  </label>
                  {slotForm.isRepeating ? (
                    <select
                      value={slotForm.studentId ? `s:${slotForm.studentId}` : slotForm.groupId ? `g:${slotForm.groupId}` : ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (!val) {
                          setSlotForm({ ...slotForm, studentId: '', groupId: '', studentName: '' });
                        } else if (val.startsWith('s:')) {
                          setSlotForm({ ...slotForm, studentId: val.slice(2), groupId: '', studentName: '' });
                        } else if (val.startsWith('g:')) {
                          setSlotForm({ ...slotForm, groupId: val.slice(2), studentId: '', studentName: '' });
                        }
                      }}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Не выбран</option>
                      {students.filter(s => !s.groupId && !s.group).length > 0 && (
                        <optgroup label="Индивидуальные">
                          {students.filter(s => !s.groupId && !s.group).map(student => (
                            <option key={student.id} value={`s:${student.id}`}>
                              {student.fullName}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {groups.length > 0 && (
                        <optgroup label="Группы">
                          {groups.map(group => (
                            <option key={group.id} value={`g:${group.id}`}>
                              {group.name}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={slotForm.studentName}
                      onChange={(e) => setSlotForm({ ...slotForm, studentName: e.target.value, studentId: '', groupId: '' })}
                      placeholder="Например: Пробный урок - Иван"
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  )}
                </div>

                {/* Summary */}
                {slotForm.lessonTypeId && (slotForm.isRepeating ? slotForm.selectedDays.length > 0 : true) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <div className="text-sm font-semibold text-blue-900 mb-1">
                      {slotForm.isRepeating
                        ? `✓ Будет создано уроков: ${slotForm.selectedDays.length}`
                        : '✓ Разовое занятие'
                      }
                    </div>
                    <div className="text-xs text-blue-700">
                      {slotForm.isRepeating
                        ? `${slotForm.selectedDays.map(d => WEEKDAYS[d]).join(', ')} с ${slotForm.startTime} до ${slotForm.endTime}`
                        : `${WEEKDAYS[quickCreateCell.dayOfWeek]} с ${slotForm.startTime} до ${slotForm.endTime}`
                      }
                    </div>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCreateSlot}
                  disabled={!slotForm.lessonTypeId || (slotForm.isRepeating && slotForm.selectedDays.length === 0)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold shadow-sm hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ✓ Создать {slotForm.isRepeating && slotForm.selectedDays.length > 0 ? `(${slotForm.selectedDays.length})` : ''}
                </button>
                <button
                  onClick={() => {
                    setQuickCreateCell(null);
                    setSlotForm({ selectedDays: [], time: '09:00', lessonTypeId: '', studentId: '', groupId: '', studentName: '', isRepeating: true, startTime: '09:00', endTime: '10:00' });
                  }}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-300 transition"
                >
                  Отмена
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Period Earnings Summary */}
        {schedule.length > 0 && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 mb-4">
              {/* First Half (1-15) */}
              <div className="bg-emerald-500/10 border border-emerald-500/25 rounded-2xl p-5 shadow-sm">
                <div className="text-sm font-semibold text-emerald-700 mb-2">
                  💰 1–15 {new Date(currentWeekStart).toLocaleString('ru-RU', { month: 'long' })}
                </div>
                {periodEarnings.firstHalf ? (
                  <>
                    <div className="text-3xl font-bold text-emerald-800 mb-1">
                      {periodEarnings.firstHalf.totalEarnings}₽
                    </div>
                    <div className="text-xs text-slate-500">
                      {periodEarnings.firstHalf.paidCount} из {periodEarnings.firstHalf.totalLessons} оплачено
                    </div>
                  </>
                ) : (
                  <div className="text-xl text-slate-400">Загрузка...</div>
                )}
              </div>

              {/* Second Half (16-end) */}
              <div className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-5 shadow-sm">
                <div className="text-sm font-semibold text-amber-700 mb-2">
                  💰 16–{new Date(new Date(currentWeekStart).getFullYear(), new Date(currentWeekStart).getMonth() + 1, 0).getDate()} {new Date(currentWeekStart).toLocaleString('ru-RU', { month: 'long' })}
                </div>
                {periodEarnings.secondHalf ? (
                  <>
                    <div className="text-3xl font-bold text-amber-800 mb-1">
                      {periodEarnings.secondHalf.totalEarnings}₽
                    </div>
                    <div className="text-xs text-slate-500">
                      {periodEarnings.secondHalf.paidCount} из {periodEarnings.secondHalf.totalLessons} оплачено
                    </div>
                  </>
                ) : (
                  <div className="text-xl text-slate-400">Загрузка...</div>
                )}
              </div>
            </div>

            {/* Weekly Statistics by Lesson Type */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-slate-700 mt-0 mb-3">
                📊 Статистика по типам уроков (за текущую неделю)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {getEarningsByLessonType().map((stats, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-xl p-4 shadow-sm border-l-4"
                    style={{ borderLeftColor: stats.color }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3.5 h-3.5 rounded-md" style={{ backgroundColor: stats.color }} />
                      <h4 className="m-0 text-sm font-semibold text-slate-800">{stats.name}</h4>
                    </div>
                    <div className="text-xs text-slate-500 space-y-1.5">
                      <div className="flex justify-between">
                        <span>Проведено уроков:</span>
                        <strong className="text-emerald-600 text-sm">{stats.completed}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-slate-600">Заработано:</span>
                        <strong className="text-emerald-600 text-sm">{stats.earnings}₽</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Empty state: no lesson types */}
        {lessonTypes.length === 0 && (
          <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-slate-200 mt-4">
            <p className="text-slate-500 text-sm mb-3">Сначала настройте типы уроков (цвета и цены)</p>
            <button
              onClick={() => setShowSettings(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-500 text-white shadow-md hover:bg-blue-600 transition text-sm font-semibold"
            >
              Открыть настройки
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherEarnings;
