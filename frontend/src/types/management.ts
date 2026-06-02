/**
 * Type definitions for Management Dashboard
 */

// ─── Core Entities ──────────────────────────────────────────

export interface Student {
  id: string;
  fullName: string;
  phone?: string;
  parentPhone?: string;
  groupId?: string;
  lessonTypeId?: string;
  teacherId?: string;
  isActive?: boolean;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  isOwner?: boolean;
  isShared?: boolean;
  studentIds?: string[];
  teacherId?: string;
}

export interface LessonType {
  id: string;
  name: string;
  color: string;
  pricePerHour: number;
}

// ─── Schedule Types ─────────────────────────────────────────

export interface CompletedLesson {
  id: string;
  weekStart: string;
  completed: boolean;
  paid: boolean;
}

export interface ScheduleSlot {
  id: string;
  dayOfWeek: number; // 0=Mon, 6=Sun
  time: string; // "HH:MM"
  studentName?: string;
  studentId?: string;
  groupId?: string;
  student?: { id: string; fullName: string };
  group?: { id: string; name: string };
  lessonTypeId: string;
  lessonType?: LessonType;
  completedLessons?: CompletedLesson[];
}

// ─── Lesson Types ───────────────────────────────────────────

export interface Lesson {
  id: string;
  date: string; // "DD.MM" format
  time?: string; // "HH:MM"
  topic: string;
  homework?: string | null;
  comment?: string | null;
  studentId?: string | null;
  groupId?: string | null;
  scheduleSlotId?: string | null;
  student?: { id: string; fullName: string } | null;
  group?: { id: string; name: string } | null;
}

// ─── Form Data Types ────────────────────────────────────────

export interface HomeworkFormData {
  topic: string;
  homework: string;
  comment: string;
  studentId: string;
  groupId: string;
}

// ─── Dashboard State Types ──────────────────────────────────

export interface CheckboxMaps {
  completedMap: Record<string, boolean>;
  paidMap: Record<string, boolean>;
}

export interface DashboardStats {
  activeToday: number;
  missedToday: number;
  homeworkNotChecked: number;
  dayEarnings: number;
}

// ─── Hook Return Types ──────────────────────────────────────

export interface UseManagementReturn {
  // Data
  students: Student[];
  groups: Group[];
  allScheduleSlots: ScheduleSlot[];
  todaySlots: ScheduleSlot[];
  todayLessons: Lesson[];
  allLessons: Lesson[];

  // UI State
  loading: boolean;
  selectedDate: string;
  showAddStudent: boolean;
  setShowAddStudent: (show: boolean) => void;
  showHomeworkModal: boolean;
  setShowHomeworkModal: (show: boolean) => void;
  selectedSlot: ScheduleSlot | null;
  setSelectedSlot: (slot: ScheduleSlot | null) => void;
  homeworkData: HomeworkFormData;
  setHomeworkData: (data: HomeworkFormData) => void;

  // Checkbox State
  slotCompleted: Record<string, boolean>;
  slotPaid: Record<string, boolean>;

  // Notes
  notes: string;
  setNotes: (notes: string) => void;

  // Telegram
  sendingToTelegram: boolean;

  // Computed Values
  weekStart: string;
  dashboardStats: DashboardStats;

  // Methods
  loadAll: () => Promise<void>;
  goToPreviousDay: () => void;
  goToNextDay: () => void;
  goToToday: () => void;
  toggleCompleted: (slotId: string) => Promise<void>;
  handleOpenHomework: (slot: ScheduleSlot) => void;
  handleSaveHomework: () => Promise<void>;
  handleSendToTelegram: () => Promise<void>;
  findLessonsForSlot: (lessons: Lesson[], slot: ScheduleSlot) => Lesson[];
}

// ─── Component Props ────────────────────────────────────────

export interface DashboardHeaderProps {
  firstName: string;
  selectedDate: string;
  activeToday: number;
  dayEarnings: number;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onToday: () => void;
  onAddStudent: () => void;
}

export interface TodayLessonsProps {
  todaySlots: ScheduleSlot[];
  allLessons: Lesson[];
  selectedDate: string;
  slotCompleted: Record<string, boolean>;
  slotPaid: Record<string, boolean>;
  onToggleCompleted: (slotId: string) => void;
  onOpenHomework: (slot: ScheduleSlot) => void;
  findLessonsForSlot: (lessons: Lesson[], slot: ScheduleSlot) => Lesson[];
}

export interface ReportsCardProps {
  missedToday: number;
  homeworkNotChecked: number;
}

export interface NotesSectionProps {
  notes: string;
  onNotesChange: (notes: string) => void;
}

export interface HomeworkModalProps {
  isOpen: boolean;
  slot: ScheduleSlot | null;
  selectedDate: string;
  homeworkData: HomeworkFormData;
  sendingToTelegram: boolean;
  onClose: () => void;
  onDataChange: (data: HomeworkFormData) => void;
  onSave: () => void;
  onSendToTelegram: () => void;
}

export interface NextStudentCardProps {
  todaySlots: ScheduleSlot[];
  allLessons: Lesson[];
  selectedDate: string;
  findLessonsForSlot: (lessons: Lesson[], slot: ScheduleSlot) => Lesson[];
}