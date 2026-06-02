import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
import { sendLessonReminder } from './telegram-bot';

/**
 * Lesson Reminder Scheduler
 * Sends reminders to students at 9:00 AM on their lesson days
 * Uses student_schedule_reminders table
 */

const MOSCOW_TIMEZONE = 'Europe/Moscow';

async function checkAndSendLessonReminders() {
  try {
    const now = new Date();
    const moscowTime = new Date(now.toLocaleString('en-US', { timeZone: MOSCOW_TIMEZONE }));
    
    // Get current day of week (0 = Monday, 6 = Sunday)
    const currentDayOfWeek = moscowTime.getDay();
    const dayIndex = currentDayOfWeek === 0 ? 6 : currentDayOfWeek - 1; // Convert to our format (0=Mon, 6=Sun)

    console.log(`[Lesson Reminder] Checking for reminders on day ${dayIndex} (${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][dayIndex]})`);

    // Get all enabled reminders for today
    const reminders = await prisma.$queryRaw<Array<{
      id: string;
      student_id: string;
      teacher_id: string;
      day_of_week: number;
      time: string;
      enabled: boolean;
      student_name: string;
      telegram_chat_id: string | null;
    }>>`
      SELECT 
        sr.id,
        sr.student_id,
        sr.teacher_id,
        sr.day_of_week,
        sr.time,
        sr.enabled,
        s."fullName" as student_name,
        s."telegramChatId"
      FROM student_schedule_reminders sr
      JOIN students s ON sr.student_id = s.id
      WHERE sr.day_of_week = ${dayIndex}
        AND sr.enabled = true
        AND s."telegramChatId" IS NOT NULL
    `;

    console.log(`[Lesson Reminder] Found ${reminders.length} reminders for today`);

    for (const reminder of reminders) {
      try {
        await sendLessonReminder(
          reminder.telegram_chat_id!,
          reminder.student_name,
          reminder.time
        );
        console.log(`✅ Sent reminder to ${reminder.student_name} for lesson at ${reminder.time}`);
      } catch (error) {
        console.error(`❌ Failed to send reminder to ${reminder.student_name}:`, error);
      }
    }
  } catch (error) {
    console.error('[Lesson Reminder] Error in checkAndSendLessonReminders:', error);
  }
}

/**
 * Start the lesson reminder scheduler
 * Runs every day at 9:00 AM Moscow time
 */
export function startLessonReminderScheduler() {
  console.log('[Lesson Reminder Scheduler] Starting...');
  
  // Run at 9:00 AM every day (Moscow time)
  cron.schedule('0 9 * * *', checkAndSendLessonReminders, {
    timezone: MOSCOW_TIMEZONE
  });

  console.log('[Lesson Reminder Scheduler] ✅ Started - will run at 9:00 AM Moscow time');
  
  // Optional: Run immediately for testing
  // checkAndSendLessonReminders();
}

export { checkAndSendLessonReminders };
