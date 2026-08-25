/**
 * Type definitions for Teacher Earnings module
 */

export interface LessonType {
  id: string;
  name: string;
  color: string;
  pricePerHour: number;
}

export interface Student {
  id: string;
  fullName: string;
  groupId?: string | null;
  group?: { id: string; name: string } | null;
  studyEndDate?: string | null;
}

export interface Group {
  id: string;
  name: string;
}

export interface CompletedLesson {
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

export interface ScheduleSlot {
  id: string;
  // Current dayOfWeek and time (with override applied)
  dayOfWeek: number;
  time: string;
  // Base dayOfWeek and time (from personal_schedule_slots, never changes)
  baseDayOfWeek?: number;
  baseTime?: string;
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
}

export interface WeeklyEarnings {
  completedCount: number;
  paidCount: number;
  totalEarnings: number;
  totalLessons?: number;
  upcomingCount?: number;
  potentialEarnings?: number;
}

export interface PeriodEarnings {
  firstHalf: WeeklyEarnings | null;
  secondHalf: WeeklyEarnings | null;
}

export interface TypeFormData {
  name: string;
  color: string;
  pricePerHour: number;
}

export interface SlotFormData {
  selectedDays: number[];
  time: string;
  lessonTypeId: string;
  studentId: string;
  groupId: string;
  studentName: string;
}

export interface CustomSlotFormData {
  customLessonTypeId: string;
  customStudentId: string;
  customGroupId: string;
  customStudentName: string;
  customPrice: string;
}

export interface BaseSlotFormData {
  studentId: string;
  groupId: string;
  studentName: string;
}

// Constants
export const WEEKDAYS = [
  'Понедельник',
  'Вторник',
  'Среда',
  'Четверг',
  'Пятница',
  'Суббота',
  'Воскресенье',
];

export const TIMES = [
  '10:00',
  '11:00',
  '12:00',
  '13:00',
  '14:00',
  '15:00',
  '16:00',
  '17:00',
  '18:00',
  '19:00',
  '20:00',
  '21:00',
];