import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Расписание студентов (жестко закодировано)
 * dayOfWeek: 0 = Воскресенье, 1 = Понедельник, ..., 6 = Суббота
 */
const STUDENT_SCHEDULES = [
  {
    studentId: 'd1e7f608-3c5a-4d81-8cca-d346e29eb2f3', // Лиза (6 кл)
    teacherId: '2f2d56ce-8485-4df8-885c-0a9afde8a3df', // Малахова Алина
    schedule: [
      { dayOfWeek: 1, time: '17:00', topic: 'English Lesson' }, // Понедельник
      { dayOfWeek: 3, time: '20:00', topic: 'English Lesson with Veronika' }, // Среда
      { dayOfWeek: 5, time: '19:00', topic: 'English Lesson' }, // Пятница
    ],
  },
  {
    studentId: 'dc00edfe-1d23-4ad4-bfec-756bd4fce421', // Ivan(Business) A2
    teacherId: '2f2d56ce-8485-4df8-885c-0a9afde8a3df', // Малахова Алина
    schedule: [
      { dayOfWeek: 4, time: '13:00', topic: 'Business English' }, // Четверг
      { dayOfWeek: 0, time: '12:00', topic: 'Business English with Veronika' }, // Воскресенье
    ],
  },
  {
    studentId: '63b6d060-dbad-4d7d-8896-6b38bfe80ea1', // Ваня 8 кл
    teacherId: 'Kljvveronika@rambler.ru', // Вероника Клюева (нужно получить ID)
    schedule: [
      { dayOfWeek: 1, time: '18:00', topic: 'English Lesson with Veronika' }, // Понедельник
      { dayOfWeek: 4, time: '18:05', topic: 'English Lesson' }, // Четверг
    ],
  },
  {
    studentId: '6594c901-593d-41bd-b76e-2e7729de0bc3', // Иванова Татьяна Сергеевна
    teacherId: 'Kljvveronika@rambler.ru', // Вероника Клюева (нужно получить ID)
    schedule: [
      { dayOfWeek: 1, time: '09:00', topic: 'English Lesson' }, // Понедельник
      { dayOfWeek: 3, time: '19:00', topic: 'English Lesson with Veronika' }, // Среда
    ],
  },
];

/**
 * Получить дату следующего дня недели
 * @param dayOfWeek 0 = Воскресенье, 1 = Понедельник, ..., 6 = Суббота
 */
function getNextDateForDay(dayOfWeek: number): Date {
  const today = new Date();
  const currentDay = today.getDay();

  let daysUntilNext = dayOfWeek - currentDay;
  if (daysUntilNext <= 0) {
    daysUntilNext += 7; // Следующая неделя
  }

  const nextDate = new Date(today);
  nextDate.setDate(today.getDate() + daysUntilNext);

  return nextDate;
}

/**
 * Форматировать дату в DD.MM
 */
function formatDate(date: Date): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  return `${day}.${month}`;
}

/**
 * Получить ID учителя по email
 */
async function getTeacherIdByEmail(email: string): Promise<string | null> {
  const teacher = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  return teacher?.id || null;
}

/**
 * Создать уроки на следующую неделю для всех студентов
 */
async function generateWeeklyLessons() {
  console.log('[WEEKLY LESSON GENERATOR] Starting weekly lesson generation...');

  let createdCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  // Получаем ID учителей
  const veronikaId = await getTeacherIdByEmail('Kljvveronika@rambler.ru');

  if (!veronikaId) {
    console.error('[WEEKLY LESSON GENERATOR] ❌ Could not find Veronika teacher ID');
    return;
  }

  // Обновляем расписание с правильными ID учителей
  const schedules = STUDENT_SCHEDULES.map(s => ({
    ...s,
    teacherId: s.teacherId === 'Kljvveronika@rambler.ru' ? veronikaId : s.teacherId,
  }));

  for (const studentSchedule of schedules) {
    for (const slot of studentSchedule.schedule) {
      try {
        const lessonDate = getNextDateForDay(slot.dayOfWeek);
        const dateString = formatDate(lessonDate);

        // Проверяем, существует ли уже урок на эту дату
        const existingLesson = await prisma.lesson.findFirst({
          where: {
            studentId: studentSchedule.studentId,
            date: dateString,
            time: slot.time,
          },
        });

        if (existingLesson) {
          console.log(`⚠️  Lesson already exists for student ${studentSchedule.studentId} on ${dateString} at ${slot.time}`);
          skippedCount++;
          continue;
        }

        // Создаем урок (БЕЗ homework - оно для домашних заданий!)
        const lesson = await prisma.lesson.create({
          data: {
            date: dateString,
            topic: slot.topic,
            homework: null, // Поле для ДЗ остается пустым
            time: slot.time,
            notificationDate: dateString, // Уведомление в день урока
            teacherId: studentSchedule.teacherId,
            studentId: studentSchedule.studentId,
          },
        });

        console.log(`✅ Created lesson: ${dateString} at ${slot.time} for student ${studentSchedule.studentId}`);
        createdCount++;
      } catch (error) {
        console.error(`❌ Error creating lesson for student ${studentSchedule.studentId}:`, error);
        errorCount++;
      }
    }
  }

  console.log(`[WEEKLY LESSON GENERATOR] Summary: ${createdCount} created, ${skippedCount} skipped, ${errorCount} errors`);
}

/**
 * Запускает генератор уроков
 * Создает уроки каждое воскресенье в 20:00 на следующую неделю
 */
export function startRecurringLessonsGenerator() {
  // Запуск каждое воскресенье в 20:00
  cron.schedule('0 20 * * 0', async () => {
    console.log('[WEEKLY LESSON GENERATOR] Running weekly lesson generation (every Sunday at 20:00)...');
    await generateWeeklyLessons();
  }, {
    timezone: 'Europe/Moscow'
  });

  console.log('✅ Recurring lessons generator started (runs every Sunday at 20:00 Moscow time)');

  // Опционально: запустить генерацию сразу при старте (для тестирования)
  // generateWeeklyLessons();
}

/**
 * Ручная генерация уроков (для тестирования)
 */
export async function generateLessonsNow() {
  console.log('[WEEKLY LESSON GENERATOR] Manual lesson generation triggered...');
  await generateWeeklyLessons();
}
