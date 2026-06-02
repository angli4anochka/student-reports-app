import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';
import { sendHomeworkToStudent } from './telegram-bot';

const prisma = new PrismaClient();

/**
 * Проверяет уроки с уведомлениями на сегодня и отправляет их
 */
async function checkAndSendNotifications() {
  try {
    const today = new Date();
    const todayString = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}`;

    console.log(`[NOTIFICATION SCHEDULER] Checking notifications for ${todayString}...`);

    // Найти все уроки с notification_date = сегодня
    const lessonsToNotify = await prisma.lesson.findMany({
      where: {
        notificationDate: todayString,
      },
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            telegramChatId: true,
          },
        },
      },
    });

    console.log(`[NOTIFICATION SCHEDULER] Found ${lessonsToNotify.length} lessons to notify`);

    let sentCount = 0;
    let errorCount = 0;

    for (const lesson of lessonsToNotify) {
      if (!lesson.student) {
        console.log(`⚠️  Lesson ${lesson.id} has no student assigned`);
        continue;
      }

      if (!lesson.student.telegramChatId) {
        console.log(`⚠️  Student ${lesson.student.fullName} (${lesson.student.id}) has no Telegram linked`);
        continue;
      }

      try {
        // Создаем стандартное напоминание о уроке (НЕ отправляем homework!)
        const reminderText = `Hi! Reminder: you have a lesson today at ${lesson.time}`;

        const result = await sendHomeworkToStudent(lesson.studentId!, {
          date: lesson.date,
          topic: lesson.topic,
          homework: reminderText,
        });

        if (result) {
          sentCount++;
          console.log(`✅ Notification sent to ${lesson.student.fullName} for lesson on ${lesson.date} at ${lesson.time}`);
        } else {
          errorCount++;
          console.log(`❌ Failed to send notification to ${lesson.student.fullName}`);
        }
      } catch (error) {
        errorCount++;
        console.error(`❌ Error sending notification to ${lesson.student.fullName}:`, error);
      }
    }

    console.log(`[NOTIFICATION SCHEDULER] Summary: ${sentCount} sent, ${errorCount} errors, ${lessonsToNotify.length - sentCount - errorCount} skipped`);
  } catch (error) {
    console.error('[NOTIFICATION SCHEDULER] Error in checkAndSendNotifications:', error);
  }
}

/**
 * Запускает планировщик уведомлений
 * Проверяет каждый день в 8:00 утра
 */
export function startNotificationScheduler() {
  // Запуск каждый день в 8:00 утра (по серверному времени)
  cron.schedule('0 8 * * *', async () => {
    console.log('[NOTIFICATION SCHEDULER] Running daily notification check at 8:00 AM...');
    await checkAndSendNotifications();
  }, {
    timezone: 'Europe/Moscow' // Московское время (UTC+3)
  });

  console.log('✅ Notification scheduler started (runs daily at 8:00 AM Moscow time)');

  // Опционально: запустить проверку сразу при старте (для тестирования)
  // checkAndSendNotifications();
}

/**
 * Ручная отправка уведомлений (для тестирования)
 */
export async function sendNotificationsNow() {
  console.log('[NOTIFICATION SCHEDULER] Manual notification send triggered...');
  await checkAndSendNotifications();
}
