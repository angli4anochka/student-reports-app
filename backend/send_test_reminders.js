const { PrismaClient } = require('@prisma/client');
const TelegramBot = require('node-telegram-bot-api');

const prisma = new PrismaClient();
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token);

async function sendTestReminders() {
  try {
    // Елена (Travel) - урок в 20:00
    const elena = await prisma.student.findUnique({
      where: { id: '9077f74e-cbda-4068-9c93-83a849239f60' },
      select: { fullName: true, telegramChatId: true }
    });
    
    // Алена 8 кл - урок в 16:00
    const alena = await prisma.student.findUnique({
      where: { id: 'ffba0136-0b12-4f10-85b0-3d57f4259399' },
      select: { fullName: true, telegramChatId: true }
    });
    
    // Отправка Елене
    if (elena && elena.telegramChatId) {
      const message = 
        `Привет! 👋\n\n` +
        `Напоминаю, что сегодня у нас занятие в 20:00 📚\n\n` +
        `Буду рада видеть тебя на уроке! ☺️`;
      
      await bot.sendMessage(elena.telegramChatId, message);
      console.log(`✅ Отправлено Елене (chat: ${elena.telegramChatId})`);
    }
    
    // Отправка Алене
    if (alena && alena.telegramChatId) {
      const message = 
        `Привет! 👋\n\n` +
        `Напоминаю, что сегодня у нас занятие в 16:00 📚\n\n` +
        `Буду рада видеть тебя на уроке! ☺️`;
      
      await bot.sendMessage(alena.telegramChatId, message);
      console.log(`✅ Отправлено Алене (chat: ${alena.telegramChatId})`);
    }
    
    console.log('\n🎉 Все напоминания отправлены!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Ошибка:', error);
    process.exit(1);
  }
}

sendTestReminders();
