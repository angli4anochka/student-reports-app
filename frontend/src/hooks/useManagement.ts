/**
 * useManagement Hook
 * Business logic for management dashboard
 */

import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  todayISO,
  getWeekStartForDate,
  currentWeekStart,
  todayDayOfWeek,
  isoToDotDate,
  dotDateToISO,
} from '../utils/dateUtils';
import {
  Student,
  Group,
  ScheduleSlot,
  Lesson,
  HomeworkFormData,
  CheckboxMaps,
  DashboardStats,
  UseManagementReturn,
} from '../types/management';

// ─── Helper Functions ───────────────────────────────────────

/**
 * Initialize completed and paid checkboxes from server data
 */
function initCheckboxMaps(slots: ScheduleSlot[], weekStart: string): CheckboxMaps {
  const completedMap: Record<string, boolean> = {};
  const paidMap: Record<string, boolean> = {};

  slots.forEach(s => {
    const cl = (s.completedLessons || []).find(c => c.weekStart === weekStart);
    completedMap[s.id] = cl?.completed ?? false;
    paidMap[s.id] = cl?.paid ?? false;
  });

  return { completedMap, paidMap };
}

/**
 * Find the best matching lessons for a schedule slot.
 * Priority: 1) match by scheduleSlotId 2) studentId 3) groupId 4) text fallback
 */
function findLessonsForSlot(lessons: Lesson[], slot: ScheduleSlot): Lesson[] {
  const seen = new Set<string>();
  const result: Lesson[] = [];
  const add = (l: Lesson) => {
    if (!seen.has(l.id)) {
      seen.add(l.id);
      result.push(l);
    }
  };

  // 1. Match by scheduleSlotId — most precise
  lessons.filter(l => l.scheduleSlotId === slot.id).forEach(add);

  // 2. Match by studentId
  if (slot.studentId) {
    lessons.filter(l => l.studentId === slot.studentId).forEach(add);
  }

  // 3. Match by groupId
  if (slot.groupId) {
    lessons.filter(l => (l.group?.id || l.groupId) === slot.groupId).forEach(add);
  }

  // 4. Text matching fallback
  const slotName = (slot.student?.fullName || slot.studentName || '').trim().toLowerCase();
  if (slotName) {
    lessons.forEach(l => {
      if (seen.has(l.id)) return;
      let matches = false;
      if (l.student?.fullName) {
        const stuName = l.student.fullName.trim().toLowerCase();
        if (stuName === slotName || stuName.includes(slotName) || slotName.includes(stuName)) matches = true;
      }
      if (!matches && l.group?.name) {
        const grpName = l.group.name.trim().toLowerCase();
        if (grpName === slotName || grpName.includes(slotName) || slotName.includes(grpName)) matches = true;
      }
      if (matches) add(l);
    });
  }

  return result;
}

// ─── Main Hook ──────────────────────────────────────────────

export function useManagement(): UseManagementReturn {
  const { user } = useAuth();

  // ── Core Data State ────────────────────────────────────────
  const [students, setStudents] = useState<Student[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [allScheduleSlots, setAllScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [todaySlots, setTodaySlots] = useState<ScheduleSlot[]>([]);
  const [todayLessons, setTodayLessons] = useState<Lesson[]>([]);
  const [allLessons, setAllLessons] = useState<Lesson[]>([]);

  // ── UI State ───────────────────────────────────────────────
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showHomeworkModal, setShowHomeworkModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<ScheduleSlot | null>(null);
  const [homeworkData, setHomeworkData] = useState<HomeworkFormData>({
    topic: '',
    homework: '',
    comment: '',
    studentId: '',
    groupId: ''
  });

  // ── Checkbox State ─────────────────────────────────────────
  const [slotCompleted, setSlotCompleted] = useState<Record<string, boolean>>({});
  const [slotPaid, setSlotPaid] = useState<Record<string, boolean>>({});

  // ── Notes State ────────────────────────────────────────────
  const [notes, setNotes] = useState<string>('');
  const [notesLoaded, setNotesLoaded] = useState<boolean>(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // ── Telegram State ─────────────────────────────────────────
  const [sendingToTelegram, setSendingToTelegram] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [lastSentHomework, setLastSentHomework] = useState<{studentId?: string; groupId?: string; date: string} | null>(null);

  // ── Load Functions ─────────────────────────────────────────

  const loadNotes = async () => {
    try {
      const data = await api.getNotes();
      setNotes(data.content || '');
      setNotesLoaded(true);
    } catch (error) {
      console.error('Error loading notes:', error);
      setNotesLoaded(true); // Mark as loaded even on error to prevent saving empty state
    }
  };

  const saveNotes = async (content: string) => {
    try {
      await api.updateNotes(content);
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  const filterLessonsByDate = useCallback(() => {
    // Get day of week for selected date
    const date = new Date(selectedDate);
    const dow = date.getDay(); // JavaScript format: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat

    // Filter schedule slots by day of week (database uses same format as JS)
    const filteredSlots = allScheduleSlots.filter(s => s.dayOfWeek === dow);

    // Sort by time
    filteredSlots.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    setTodaySlots(filteredSlots);

    // Init checkboxes
    const ws = getWeekStartForDate(selectedDate);
    const { completedMap, paidMap } = initCheckboxMaps(filteredSlots, ws);
    setSlotCompleted(completedMap);
    setSlotPaid(paidMap);

    // Filter lessons by selected date
    const selectedDot = isoToDotDate(selectedDate);
    const filtered = allLessons.filter(l => l.date === selectedDot);
    setTodayLessons(filtered);
  }, [selectedDate, allScheduleSlots, allLessons]);

  const loadAll = useCallback(async () => {
    try {
      // Load data with error handling
      const studentsData = await api.getStudents({}).catch(err => {
        console.error('Error loading students:', err);
        return [];
      });

      const schedule = await api.getCompletedLessons(currentWeekStart()).catch(err => {
        console.error('Error loading schedule:', err);
        return [];
      });

      const lessons = await api.getLessons({}).catch(err => {
        console.error('Error loading lessons:', err);
        return [];
      });

      const groupsData = await api.getGroups().catch(err => {
        console.error('Error loading groups:', err);
        return [];
      });

      setStudents(studentsData);
      setGroups(groupsData);

      // Store all schedule slots
      const allSlots = schedule as ScheduleSlot[];
      setAllScheduleSlots(allSlots);

      // filter schedule to today
      const dow = todayDayOfWeek();
      const today = allSlots.filter(s => s.dayOfWeek === dow);
      today.sort((a, b) => (a.time || '').localeCompare(b.time || ''));
      setTodaySlots(today);

      // init checkboxes
      const ws = getWeekStartForDate(selectedDate);
      const { completedMap, paidMap } = initCheckboxMaps(today, ws);
      setSlotCompleted(completedMap);
      setSlotPaid(paidMap);

      // store all lessons
      const allL = lessons as Lesson[];
      setAllLessons(allL);
      const todayDot = isoToDotDate(todayISO());
      const todayL = allL.filter(l => l.date === todayDot);
      setTodayLessons(todayL);

    } catch (e) {
      console.error('ManagementDashboard load error:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // ── Navigation Functions ───────────────────────────────────

  const goToPreviousDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() - 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const goToNextDay = () => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${d}`);
  };

  const goToToday = () => {
    setSelectedDate(todayISO());
  };

  // ── Lesson Management ──────────────────────────────────────

  const toggleCompleted = async (slotId: string) => {
    const slot = todaySlots.find(s => s.id === slotId);
    if (!slot) return;

    const ws = getWeekStartForDate(selectedDate);
    const isCompleted = slotCompleted[slotId];
    const isPaid = slotPaid[slotId];

    // Three-state: empty → completed → paid → empty
    let newCompleted = false;
    let newPaid = false;

    if (!isCompleted && !isPaid) {
      newCompleted = true;
      newPaid = false;
    } else if (isCompleted && !isPaid) {
      newCompleted = true;
      newPaid = true;
    } else {
      newCompleted = false;
      newPaid = false;
    }

    try {
      // Use new API format: updateCompletedLesson(scheduleSlotId, weekStart, data)
      await api.updateCompletedLesson(slotId, ws, {
        completed: newCompleted,
        paid: newPaid
      });

      // Update local state
      setSlotCompleted(prev => ({ ...prev, [slotId]: newCompleted }));
      setSlotPaid(prev => ({ ...prev, [slotId]: newPaid }));

      // Update the slot's completedLessons
      const updatedSlots = allScheduleSlots.map(s => {
        if (s.id === slotId) {
          const cl = (s.completedLessons || []).find(c => c.weekStart === ws);
          if (cl) {
            // Update existing completedLesson
            const updatedCL = (s.completedLessons || []).map(c =>
              c.weekStart === ws ? { ...c, completed: newCompleted, paid: newPaid } : c
            );
            return { ...s, completedLessons: updatedCL };
          } else {
            // Add new completedLesson
            return {
              ...s,
              completedLessons: [
                ...(s.completedLessons || []),
                { weekStart: ws, completed: newCompleted, paid: newPaid }
              ]
            };
          }
        }
        return s;
      });

      setAllScheduleSlots(updatedSlots);
    } catch (error) {
      console.error('Error updating completed lesson:', error);
    }
  };

  // ── Homework Management ────────────────────────────────────

  const handleOpenHomework = (slot: ScheduleSlot) => {
    setSelectedSlot(slot);

    const matched = findLessonsForSlot(allLessons, slot);
    const selectedDot = isoToDotDate(selectedDate);
    const todayLesson = matched.find(l => l.date === selectedDot) ||
                       todayLessons.find(l => slot.time && l.time === slot.time);

    const prevLesson = matched
      .filter(l => dotDateToISO(l.date) < selectedDate)
      .sort((a, b) => dotDateToISO(b.date).localeCompare(dotDateToISO(a.date)))[0];

    setHomeworkData({
      topic: todayLesson?.topic || '',
      homework: todayLesson?.homework || '',
      comment: todayLesson?.comment || '',
      studentId: slot.studentId || '',
      groupId: slot.groupId || '',
    });

    setShowHomeworkModal(true);
  };

  const handleSaveHomework = async () => {
    if (!selectedSlot) return;

    try {
      const matched = findLessonsForSlot(allLessons, selectedSlot);
      const selectedDot = isoToDotDate(selectedDate);
      let lesson = matched.find(l => l.date === selectedDot) ||
                  todayLessons.find(l => selectedSlot.time && l.time === selectedSlot.time);

      if (lesson) {
        // Update existing lesson
        await api.updateLesson(lesson.id, {
          topic: homeworkData.topic,
          homework: homeworkData.homework,
          comment: homeworkData.comment,
        });
      } else {
        // Create new lesson
        const newLesson = await api.createLesson({
          date: selectedDot,
          topic: homeworkData.topic,
          homework: homeworkData.homework,
          comment: homeworkData.comment,
          studentId: homeworkData.studentId || null,
          groupId: homeworkData.groupId || null,
          scheduleSlotId: selectedSlot.id,
        });

        const newL: Lesson = {
          ...newLesson,
          student: selectedSlot.student || null,
          group: selectedSlot.group || null,
        };

        setAllLessons(prev => [...prev, newL]);
        setTodayLessons(prev => [...prev, newL]);
      }

      setShowHomeworkModal(false);
      setSelectedSlot(null);
      await loadAll();
    } catch (error) {
      console.error('Error saving homework:', error);
    }
  };

  const handleSendToTelegram = async () => {
    if (!selectedSlot || !homeworkData.homework || !homeworkData.topic) return;

    setSendingToTelegram(true);
    try {
      await api.sendHomeworkToTelegram({
        studentId: selectedSlot.studentId,
        groupId: selectedSlot.groupId,
        date: selectedDate,
        topic: homeworkData.topic,
        homework: homeworkData.homework,
      });

      alert('Домашнее задание отправлено в Telegram!');

      // Сохраняем данные для отправки картинки и показываем модалку
      setLastSentHomework({
        studentId: selectedSlot.studentId,
        groupId: selectedSlot.groupId,
        date: selectedDate,
      });
      setShowImageModal(true);
    } catch (error) {
      console.error('Error sending to Telegram:', error);
      alert('Ошибка при отправке в Telegram');
    } finally {
      setSendingToTelegram(false);
    }
  };

  const handleSendImage = async (file: File) => {
    if (!lastSentHomework) return;

    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      if (lastSentHomework.studentId) {
        formData.append('studentId', lastSentHomework.studentId);
      }
      if (lastSentHomework.groupId) {
        formData.append('groupId', lastSentHomework.groupId);
      }

      await api.sendImageToTelegram(formData);
      alert('Картинка отправлена в Telegram!');
      setShowImageModal(false);
      setLastSentHomework(null);
    } catch (error) {
      console.error('Error sending image to Telegram:', error);
      alert('Ошибка при отправке картинки');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSkipImage = () => {
    setShowImageModal(false);
    setLastSentHomework(null);
  };

  // ── Effects ────────────────────────────────────────────────

  useEffect(() => {
    loadAll();
    loadNotes();
  }, []);

  useEffect(() => {
    const selectedWeek = getWeekStartForDate(selectedDate);
    const currentWeek = currentWeekStart();

    if (selectedWeek !== currentWeek) {
      // Reload schedule for different week
      api.getCompletedLessons(selectedWeek).then(schedule => {
        const allSlots = schedule as ScheduleSlot[];
        setAllScheduleSlots(allSlots);
      }).catch(err => {
        console.error('Error reloading schedule for week', selectedWeek, ':', err);
      });
    } else if (allScheduleSlots.length > 0 || allLessons.length > 0) {
      filterLessonsByDate();
    }
  }, [selectedDate, filterLessonsByDate]);

  useEffect(() => {
    if (allScheduleSlots.length > 0 || allLessons.length > 0) {
      filterLessonsByDate();
    }
  }, [allScheduleSlots, allLessons, filterLessonsByDate]);

  // Auto-save notes with debounce
  useEffect(() => {
    // Only save if notes have been loaded from server first
    if (!notesLoaded) {
      return;
    }

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeout = setTimeout(() => {
      if (notes !== undefined && notes !== null) {
        saveNotes(notes);
      }
    }, 1000);

    setSaveTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [notes, notesLoaded]);

  // ── Computed Values ────────────────────────────────────────

  const weekStart = getWeekStartForDate(selectedDate);

  // Calculate dashboard stats
  const todayPaid = todaySlots.filter(s => {
    const cl = (s.completedLessons || []).find(c => c.weekStart === weekStart);
    return cl?.paid;
  });

  const dayEarnings = todayPaid.reduce((sum, s) => sum + (s.lessonType?.pricePerHour || 0), 0);

  const nowHour = new Date().getHours();
  const missedToday = todaySlots.filter(s => {
    const slotHour = parseInt((s.time || '0').split(':')[0], 10);
    return slotHour <= nowHour && !slotCompleted[s.id];
  }).length;

  const activeToday = todaySlots.length;

  const homeworkNotChecked = todaySlots.filter(slot => {
    const matched = findLessonsForSlot(allLessons, slot);
    const prev = matched
      .filter(l => dotDateToISO(l.date) < todayISO())
      .sort((a, b) => dotDateToISO(b.date).localeCompare(dotDateToISO(a.date)));
    const prevLesson = prev[0];
    return prevLesson?.homework && prevLesson.homework.trim() !== '';
  }).length;

  const dashboardStats: DashboardStats = {
    activeToday,
    missedToday,
    homeworkNotChecked,
    dayEarnings,
  };

  return {
    // Data
    students,
    groups,
    allScheduleSlots,
    todaySlots,
    todayLessons,
    allLessons,

    // UI State
    loading,
    selectedDate,
    showAddStudent,
    setShowAddStudent,
    showHomeworkModal,
    setShowHomeworkModal,
    selectedSlot,
    setSelectedSlot,
    homeworkData,
    setHomeworkData,

    // Checkbox State
    slotCompleted,
    slotPaid,

    // Notes
    notes,
    setNotes,

    // Telegram
    sendingToTelegram,
    showImageModal,
    uploadingImage,

    // Computed
    weekStart,
    dashboardStats,

    // Methods
    loadAll,
    goToPreviousDay,
    goToNextDay,
    goToToday,
    toggleCompleted,
    handleOpenHomework,
    handleSaveHomework,
    handleSendToTelegram,
    handleSendImage,
    handleSkipImage,
    findLessonsForSlot,
  };
}