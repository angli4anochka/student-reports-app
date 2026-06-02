import TelegramBot from 'node-telegram-bot-api';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('⚠️  TELEGRAM_BOT_TOKEN not found in environment variables');
}

let bot: TelegramBot | null = null;

// Инициализация бота
export function initTelegramBot() {
  if (!token) {
    console.log('⚠️  Telegram bot disabled: no token provided');
    return;
  }

  try {
    bot = new TelegramBot(token, { polling: true });
    console.log('✅ Telegram bot started');

    // Обработчик команды /start
    bot.onText(/^\/start$/, async (msg) => {
      const chatId = msg.chat.id;
      const chatType = msg.chat.type;

      bot?.sendMessage(
        chatId,
        '👋 Привет! Я бот для отправки домашних заданий.\n\n' +
        '📝 Доступные команды:\n' +
        '/link STUDENT_ID - привязать этот чат к студенту\n' +
        '/findstudent ИМЯ - найти студента по имени\n' +
        '/status - проверить статус привязки\n' +
        '/myid - узнать ID этого чата\n' +
        '/unlink - отвязать чат от студента\n\n' +
        '💡 Работает как в группах, так и в личных чатах!\n' +
        '(ID студента можно найти с помощью /findstudent)'
      );
    });

    // Команда /myid - показать chat ID
    bot.onText(/^\/myid$/, async (msg) => {
      const chatId = msg.chat.id;
      const chatType = msg.chat.type;
      const chatTitle = msg.chat.title || 'личный чат';

      bot?.sendMessage(
        chatId,
        `📱 ID этого чата: \`${chatId}\`\n` +
        `📂 Тип: ${chatType}\n` +
        `📝 Название: ${chatTitle}`,
        { parse_mode: 'Markdown' }
      );
    });

    // Команда /findstudent - поиск студента по имени
    bot.onText(/\/findstudent (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const searchQuery = match?.[1]?.trim();

      if (!searchQuery) {
        bot?.sendMessage(chatId, '⚠️ Укажите имя для поиска.\nПример: /findstudent Алена');
        return;
      }

      try {
        // Поиск студентов по имени (case-insensitive)
        const students = await prisma.student.findMany({
          where: {
            fullName: {
              contains: searchQuery,
              mode: 'insensitive'
            }
          },
          select: {
            id: true,
            fullName: true,
            telegramChatId: true,
            teacher: {
              select: {
                fullName: true
              }
            }
          },
          take: 10
        });

        if (students.length === 0) {
          bot?.sendMessage(chatId, `❌ Студенты с именем "${searchQuery}" не найдены.`);
          return;
        }

        let message = `🔍 Найдено студентов: ${students.length}\n\n`;

        students.forEach((student, index) => {
          const linked = student.telegramChatId ? '✅ привязан' : '⭕️ не привязан';
          message += `${index + 1}. ${student.fullName}\n`;
          message += `   ID: \`${student.id}\`\n`;
          message += `   Преподаватель: ${student.teacher?.fullName || 'не указан'}\n`;
          message += `   Telegram: ${linked}\n\n`;
        });

        message += '\n💡 Для привязки используйте:\n/link STUDENT_ID';

        bot?.sendMessage(chatId, message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error('Error finding student:', error);
        bot?.sendMessage(chatId, '❌ Ошибка при поиске студента.');
      }
    });

    // Обработчик команды /link для привязки чата (группы или личного) к студенту
    bot.onText(/\/link (.+)/, async (msg, match) => {
      const chatId = msg.chat.id;
      const chatType = msg.chat.type;
      const studentId = match?.[1]?.trim();

      if (!studentId) {
        bot?.sendMessage(chatId, '⚠️ Укажите ID студента.\nПример: /link abc-123-def');
        return;
      }

      try {
        // Найти студента по ID
        const student = await prisma.student.findUnique({
          where: { id: studentId },
          select: {
            id: true,
            fullName: true,
            telegramChatId: true,
            teacher: {
              select: { fullName: true }
            }
          }
        });

        if (!student) {
          bot?.sendMessage(
            chatId,
            `❌ Студент с ID \`${studentId}\` не найден.\n\n` +
            `Используйте /findstudent ИМЯ для поиска студента.`,
            { parse_mode: 'Markdown' }
          );
          return;
        }

        // Проверяем, не привязан ли студент к другому чату
        if (student.telegramChatId && student.telegramChatId !== String(chatId)) {
          bot?.sendMessage(
            chatId,
            `⚠️ Студент ${student.fullName} уже привязан к другому чату (${student.telegramChatId}).\n\n` +
            `Используйте /unlink в том чате, чтобы отвязать.`
          );
          return;
        }

        // Привязать чат к студенту
        const chatName = msg.chat.title || msg.chat.first_name || msg.chat.username || 'личный чат';
        await prisma.student.update({
          where: { id: student.id },
          data: {
            telegramChatId: String(chatId),
            telegramUsername: chatName
          }
        });

        const chatTypeText = (chatType === 'group' || chatType === 'supergroup') ? 'Группа' : 'Чат';
        bot?.sendMessage(
          chatId,
          `✅ ${chatTypeText} успешно привязан!\n\n` +
          `👤 Студент: ${student.fullName}\n` +
          `👨‍🏫 Преподаватель: ${student.teacher?.fullName || 'не указан'}\n\n` +
          `📚 Домашние задания будут приходить сюда автоматически!`
        );

        console.log(`✅ Chat ${chatId} (${chatName}) linked to student ${student.fullName} (${student.id})`);
      } catch (error) {
        console.error('Error linking chat to student:', error);
        bot?.sendMessage(chatId, '❌ Произошла ошибка при привязке. Попробуйте позже.');
      }
    });

    // Команда /unlink - отвязать чат от студента
    bot.onText(/^\/unlink$/, async (msg) => {
      const chatId = msg.chat.id;

      try {
        // Найти студента, привязанного к этому чату
        const student = await prisma.student.findFirst({
          where: { telegramChatId: String(chatId) },
          select: { id: true, fullName: true }
        });

        if (!student) {
          bot?.sendMessage(chatId, '⚠️ Этот чат не привязан ни к одному студенту.');
          return;
        }

        // Отвязать чат
        await prisma.student.update({
          where: { id: student.id },
          data: {
            telegramChatId: null,
            telegramUsername: null
          }
        });

        bot?.sendMessage(
          chatId,
          `✅ Чат отвязан от студента: ${student.fullName}\n\n` +
          `Домашние задания больше не будут приходить сюда.`
        );

        console.log(`✅ Chat ${chatId} unlinked from student ${student.fullName} (${student.id})`);
      } catch (error) {
        console.error('Error unlinking chat:', error);
        bot?.sendMessage(chatId, '❌ Ошибка при отвязке. Попробуйте позже.');
      }
    });

    // Команда /status - показать информацию о привязке
    bot.onText(/^\/status$/, async (msg) => {
      const chatId = msg.chat.id;
      const chatType = msg.chat.type;

      try {
        // Найти студента, привязанного к этому чату
        const student = await prisma.student.findFirst({
          where: { telegramChatId: String(chatId) },
          select: {
            id: true,
            fullName: true,
            teacher: {
              select: { fullName: true }
            }
          }
        });

        if (!student) {
          bot?.sendMessage(
            chatId,
            '⭕️ Этот чат не привязан ни к одному студенту.\n\n' +
            'Используйте /link STUDENT_ID для привязки.'
          );
          return;
        }

        const chatTypeText = (chatType === 'group' || chatType === 'supergroup') ? 'группе' : 'чату';
        bot?.sendMessage(
          chatId,
          `📊 Статус привязки:\n\n` +
          `✅ Этот ${chatTypeText} привязан к студенту: ${student.fullName}\n` +
          `👨‍🏫 Преподаватель: ${student.teacher?.fullName || 'не указан'}\n` +
          `📱 Chat ID: \`${chatId}\`\n\n` +
          `Используйте /unlink для отвязки.`,
          { parse_mode: 'Markdown' }
        );
      } catch (error) {
        console.error('Error checking status:', error);
        bot?.sendMessage(chatId, '❌ Ошибка при проверке статуса.');
      }
    });

    // Обработка ошибок
    bot.on('polling_error', (error) => {
      console.error('Telegram bot polling error:', error);
    });

  } catch (error) {
    console.error('Failed to initialize Telegram bot:', error);
  }
}

// Отправка домашнего задания студенту
export async function sendHomeworkToStudent(studentId: string, homework: {
  date: string;
  topic: string;
  homework: string;
}) {
  if (!bot) {
    console.log('⚠️  Telegram bot not initialized');
    return false;
  }

  try {
    // Получить chatId студента
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { telegramChatId: true, fullName: true }
    });

    if (!student?.telegramChatId) {
      console.log(`⚠️  Student ${studentId} does not have Telegram linked`);
      return false;
    }

    const message = `📚 Новое домашнее задание\n\n📅 Дата: ${homework.date}\n📖 Тема: ${homework.topic}\n\n✏️ Задание:\n${homework.homework}`;

    await bot.sendMessage(student.telegramChatId, message);
    console.log(`✅ Homework sent to ${student.fullName} (${student.telegramChatId})`);
    return true;
  } catch (error) {
    console.error('Error sending homework to Telegram:', error);
    return false;
  }
}

// Отправка домашнего задания всем студентам группы
export async function sendHomeworkToGroup(groupId: string, homework: {
  date: string;
  topic: string;
  homework: string;
}) {
  if (!bot) {
    console.log('⚠️  Telegram bot not initialized');
    return { sent: 0, total: 0 };
  }

  try {
    // Получить всех студентов группы с привязанным Telegram
    const students = await prisma.student.findMany({
      where: {
        groupId,
        telegramChatId: { not: null }
      },
      select: { id: true, telegramChatId: true, fullName: true }
    });

    let sent = 0;
    const total = students.length;

    for (const student of students) {
      if (student.telegramChatId) {
        const success = await sendHomeworkToStudent(student.id, homework);
        if (success) sent++;
      }
    }

    console.log(`✅ Homework sent to ${sent}/${total} students in group ${groupId}`);
    return { sent, total };
  } catch (error) {
    console.error('Error sending homework to group:', error);
    return { sent: 0, total: 0 };
  }
}

// Отправка изображения студенту
export async function sendImageToStudent(studentId: string, imageBuffer: Buffer, caption?: string) {
  if (!bot) {
    console.log('⚠️  Telegram bot not initialized');
    return false;
  }

  try {
    // Получить chatId студента
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { telegramChatId: true, fullName: true }
    });

    if (!student?.telegramChatId) {
      console.log(`⚠️  Student ${studentId} does not have Telegram linked`);
      return false;
    }

    await bot.sendPhoto(student.telegramChatId, imageBuffer, {
      caption: caption || '📷 Изображение к домашнему заданию'
    });
    console.log(`✅ Image sent to ${student.fullName} (${student.telegramChatId})`);
    return true;
  } catch (error) {
    console.error('Error sending image to Telegram:', error);
    return false;
  }
}

// Отправка изображения всем студентам группы
export async function sendImageToGroup(groupId: string, imageBuffer: Buffer, caption?: string) {
  if (!bot) {
    console.log('⚠️  Telegram bot not initialized');
    return { sent: 0, total: 0 };
  }

  try {
    // Получить всех студентов группы с привязанным Telegram
    const students = await prisma.student.findMany({
      where: {
        groupId,
        telegramChatId: { not: null }
      },
      select: { id: true, telegramChatId: true, fullName: true }
    });

    let sent = 0;
    const total = students.length;

    for (const student of students) {
      if (student.telegramChatId) {
        const success = await sendImageToStudent(student.id, imageBuffer, caption);
        if (success) sent++;
      }
    }

    console.log(`✅ Image sent to ${sent}/${total} students in group ${groupId}`);
    return { sent, total };
  } catch (error) {
    console.error('Error sending image to group:', error);
    return { sent: 0, total: 0 };
  }
}

export { bot };

// Отправка напоминания о уроке
export async function sendLessonReminder(chatId: string, studentName: string, lessonTime: string) {
  if (!bot) {
    console.log('⚠️  Telegram bot not initialized');
    return false;
  }

  try {
    const message = 
      `Привет! 👋\n\n` +
      `Напоминаю, что сегодня у нас занятие в ${lessonTime} 📚\n\n` +
      `Буду рада видеть тебя на уроке! ☺️`;

    await bot.sendMessage(chatId, message);
    console.log(`✅ Lesson reminder sent to ${studentName} (chat: ${chatId})`);
    return true;
  } catch (error) {
    console.error('Error sending lesson reminder to Telegram:', error);
    return false;
  }
}
