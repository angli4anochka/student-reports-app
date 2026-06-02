/**
 * Date utility functions for the application
 */

/**
 * Get greeting based on current time of day
 */
export function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Доброе утро';
  if (h < 18) return 'Добрый день';
  return 'Добрый вечер';
}

/**
 * Get today's date in ISO format (YYYY-MM-DD)
 */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/**
 * Get the Monday of the week for a given date
 */
export function getWeekStartForDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date);
  monday.setDate(diff);
  monday.setHours(0, 0, 0, 0);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, '0');
  const d = String(monday.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get Monday of current week
 */
export function currentWeekStart(): string {
  return getWeekStartForDate(todayISO());
}

/**
 * Get today's day of week using JavaScript format
 * Returns: 0=Sun, 1=Mon, 2=Tue, 3=Wed, 4=Thu, 5=Fri, 6=Sat
 */
export function todayDayOfWeek(): number {
  // Database uses the same format as JavaScript getDay()
  return new Date().getDay();
}

/**
 * Format time string to HH:MM format
 */
export function formatTime(t: string): string {
  const parts = (t || '').split(':');
  return `${parts[0]}:${parts[1] || '00'}`;
}

/**
 * Convert ISO date (YYYY-MM-DD) to dot format (DD.MM)
 */
export function isoToDotDate(iso: string): string {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

/**
 * Convert dot date (DD.MM) to ISO format (YYYY-MM-DD)
 * Assumes dates from September-December are in 2025, January-August are in 2026
 */
export function dotDateToISO(dotDate: string): string {
  const [d, m] = dotDate.split('.');
  const month = parseInt(m, 10);
  const year = month >= 9 ? 2025 : 2026;
  return `${year}-${m}-${d}`;
}

/**
 * Get day name in Russian
 * @param dayOfWeek - 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
 */
export function getDayName(dayOfWeek: number): string {
  const days = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[dayOfWeek] ?? '';
}

/**
 * Get full day name in Russian
 * @param dayOfWeek - 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
 */
export function getFullDayName(dayOfWeek: number): string {
  const days = [
    'Воскресенье',
    'Понедельник',
    'Вторник',
    'Среда',
    'Четверг',
    'Пятница',
    'Суббота',
  ];
  return days[dayOfWeek] || '';
}

/**
 * Format date to Russian format DD.MM.YYYY
 */
export function formatDateRu(dateStr: string): string {
  const date = new Date(dateStr);
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}.${m}.${y}`;
}

/**
 * Check if date is today
 */
export function isToday(dateStr: string): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return date.getTime() === today.getTime();
}

/**
 * Get the current academic year (September to August)
 */
export function getCurrentAcademicYear(): { start: number; end: number } {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  // Academic year starts in September
  if (month >= 8) {
    // September (8) - December
    return { start: year, end: year + 1 };
  } else {
    // January - August
    return { start: year - 1, end: year };
  }
}

/**
 * Add days to a date
 */
export function addDays(dateStr: string, days: number): string {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + days);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Get week number of the year
 */
export function getWeekNumber(dateStr: string): number {
  const date = new Date(dateStr);
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - startOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}