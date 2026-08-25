import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import {
  LessonType,
  Student,
  Group,
  ScheduleSlot,
  WeeklyEarnings,
  PeriodEarnings,
  TypeFormData,
  SlotFormData,
  CustomSlotFormData,
  BaseSlotFormData,
} from '../types/earnings';

export const useEarnings = () => {
  // Initialize with current week
  const getInitialWeekStart = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today);
    monday.setDate(diff);
    monday.setHours(0, 0, 0, 0);
    const year = monday.getFullYear();
    const month = String(monday.getMonth() + 1).padStart(2, '0');
    const dayStr = String(monday.getDate()).padStart(2, '0');
    return `${year}-${month}-${dayStr}`;
  };

  // State management
  const [lessonTypes, setLessonTypes] = useState<LessonType[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(getInitialWeekStart());
  const [weeklyEarnings, setWeeklyEarnings] = useState<WeeklyEarnings | null>(null);
  const [periodEarnings, setPeriodEarnings] = useState<PeriodEarnings>({
    firstHalf: null,
    secondHalf: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingSlots, setUpdatingSlots] = useState<Set<string>>(new Set());

  // Form states
  const [showAddType, setShowAddType] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [editingType, setEditingType] = useState<LessonType | null>(null);
  const [editingSlot, setEditingSlot] = useState<{ slot: ScheduleSlot; weekStart: string } | null>(null);
  const [editingBaseSlot, setEditingBaseSlot] = useState<ScheduleSlot | null>(null);
  const [baseSlotForm, setBaseSlotForm] = useState<BaseSlotFormData>({ studentId: '', groupId: '', studentName: '' });
  const [typeForm, setTypeForm] = useState<TypeFormData>({ name: '', color: '#4CAF50', pricePerHour: 0 });
  const [slotForm, setSlotForm] = useState<SlotFormData>({
    selectedDays: [],
    time: '10:00',
    lessonTypeId: '',
    studentId: '',
    groupId: '',
    studentName: '',
  });
  const [customSlotForm, setCustomSlotForm] = useState<CustomSlotFormData>({
    customLessonTypeId: '',
    customStudentId: '',
    customGroupId: '',
    customStudentName: '',
    customPrice: '',
  });

  // Load initial data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [typesData, studentsData, groupsData] = await Promise.all([
        api.getLessonTypes(),
        api.getStudents(),
        api.getGroups(),
      ]);
      setLessonTypes(typesData);
      setStudents(studentsData);
      setGroups(groupsData);
    } catch (err) {
      setError('Ошибка загрузки данных');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load schedule for specific week
  const loadSchedule = useCallback(async (weekStart: string) => {
    try {
      const data = await api.getSchedule(weekStart);
      setSchedule(data);
    } catch (err) {
      setError('Ошибка загрузки расписания');
      console.error('Error loading schedule:', err);
    }
  }, []);

  // Load earnings for specific week
  const loadWeeklyEarnings = useCallback(async (weekStart: string) => {
    try {
      const data = await api.getWeeklyEarnings(weekStart);
      setWeeklyEarnings(data);
    } catch (err) {
      setError('Ошибка загрузки заработков');
      console.error('Error loading earnings:', err);
    }
  }, []);

  // Load period earnings
  const loadPeriodEarnings = useCallback(async () => {
    try {
      const [firstHalf, secondHalf] = await Promise.all([
        api.getWeeklyEarnings('2026-02-01', true),
        api.getWeeklyEarnings('2026-02-16', true),
      ]);
      setPeriodEarnings({ firstHalf, secondHalf });
    } catch (err) {
      setError('Ошибка загрузки периодов');
      console.error('Error loading period earnings:', err);
    }
  }, []);

  // Update completed lesson
  const updateCompletedLesson = useCallback(
    async (lessonId: string, completed: boolean, paid: boolean) => {
      setUpdatingSlots(prev => new Set(prev).add(lessonId));
      try {
        await api.updateCompletedLesson(lessonId, { completed, paid });
        await Promise.all([loadSchedule(currentWeekStart), loadWeeklyEarnings(currentWeekStart)]);
      } catch (err) {
        setError('Ошибка обновления урока');
        console.error('Error updating lesson:', err);
      } finally {
        setUpdatingSlots(prev => {
          const newSet = new Set(prev);
          newSet.delete(lessonId);
          return newSet;
        });
      }
    },
    [currentWeekStart, loadSchedule, loadWeeklyEarnings]
  );

  // Lesson type operations
  const createLessonType = useCallback(async (data: TypeFormData) => {
    try {
      await api.createLessonType(data);
      await loadData();
      setShowAddType(false);
      setTypeForm({ name: '', color: '#4CAF50', pricePerHour: 0 });
    } catch (err) {
      setError('Ошибка создания типа урока');
      console.error('Error creating lesson type:', err);
    }
  }, [loadData]);

  const updateLessonType = useCallback(async (id: string, data: TypeFormData) => {
    try {
      await api.updateLessonType(id, data);
      await loadData();
      setEditingType(null);
    } catch (err) {
      setError('Ошибка обновления типа урока');
      console.error('Error updating lesson type:', err);
    }
  }, [loadData]);

  const deleteLessonType = useCallback(async (id: string) => {
    if (window.confirm('Удалить этот тип урока?')) {
      try {
        await api.deleteLessonType(id);
        await loadData();
      } catch (err) {
        setError('Ошибка удаления типа урока');
        console.error('Error deleting lesson type:', err);
      }
    }
  }, [loadData]);

  // Schedule slot operations
  const createScheduleSlot = useCallback(async (data: SlotFormData) => {
    try {
      const student = students.find(item => item.id === data.studentId);
      await api.createScheduleSlot({ ...data, startDate: currentWeekStart, endDate: student?.studyEndDate?.slice(0, 10) });
      await loadSchedule(currentWeekStart);
      setShowAddSlot(false);
      setSlotForm({
        selectedDays: [],
        time: '10:00',
        lessonTypeId: '',
        studentId: '',
        groupId: '',
        studentName: '',
      });
    } catch (err) {
      setError('Ошибка создания слота');
      console.error('Error creating schedule slot:', err);
    }
  }, [currentWeekStart, loadSchedule, students]);

  const updateScheduleSlot = useCallback(async (id: string, data: Partial<ScheduleSlot>) => {
    try {
      await api.updateScheduleSlot(id, data);
      await loadSchedule(currentWeekStart);
      setEditingBaseSlot(null);
    } catch (err) {
      setError('Ошибка обновления слота');
      console.error('Error updating schedule slot:', err);
    }
  }, [currentWeekStart, loadSchedule, students]);

  const deleteScheduleSlot = useCallback(async (id: string) => {
    if (window.confirm('Удалить этот слот из расписания?')) {
      try {
        await api.deleteScheduleSlot(id);
        await loadSchedule(currentWeekStart);
      } catch (err) {
        setError('Ошибка удаления слота');
        console.error('Error deleting schedule slot:', err);
      }
    }
  }, [currentWeekStart, loadSchedule, students]);

  // Create schedule override for a specific week
  const createScheduleOverride = useCallback(async (scheduleSlotId: string, weekStart: string, newDayOfWeek: number, newTime: string) => {
    try {
      await api.createScheduleOverride({
        scheduleSlotId,
        weekStart,
        newDayOfWeek,
        newTime,
      });
      await loadSchedule(weekStart);
    } catch (err) {
      setError('Ошибка создания переопределения расписания');
      console.error('Error creating schedule override:', err);
    }
  }, [loadSchedule]);

  // Week navigation
  const navigateWeek = useCallback((direction: 'prev' | 'next' | 'today') => {
    let newWeekStart: string;

    if (direction === 'today') {
      newWeekStart = getInitialWeekStart();
    } else {
      const currentDate = new Date(currentWeekStart);
      const offset = direction === 'prev' ? -7 : 7;
      currentDate.setDate(currentDate.getDate() + offset);

      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      const day = String(currentDate.getDate()).padStart(2, '0');
      newWeekStart = `${year}-${month}-${day}`;
    }

    setCurrentWeekStart(newWeekStart);
  }, [currentWeekStart]);

  // Create payout
  const createPayout = useCallback(async (period: 'first' | 'second') => {
    const earnings = period === 'first' ? periodEarnings.firstHalf : periodEarnings.secondHalf;
    if (!earnings) return;

    try {
      await api.createPayout({
        period,
        amount: earnings.totalEarnings,
        lessonCount: earnings.paidCount,
      });
      await loadPeriodEarnings();
      alert('Выплата успешно оформлена!');
    } catch (err) {
      setError('Ошибка оформления выплаты');
      console.error('Error creating payout:', err);
    }
  }, [periodEarnings, loadPeriodEarnings]);

  // Effects
  useEffect(() => {
    loadData();
    loadPeriodEarnings();
  }, [loadData, loadPeriodEarnings]);

  useEffect(() => {
    loadSchedule(currentWeekStart);
    loadWeeklyEarnings(currentWeekStart);
  }, [currentWeekStart, loadSchedule, loadWeeklyEarnings]);

  return {
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
  };
};