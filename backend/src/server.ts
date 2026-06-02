import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import session from 'express-session';
import { PrismaClient } from '@prisma/client';
import passport from './config/passport';
import { initializePassport } from './config/passport';

import authRoutes from './routes/auth';
import authGoogleRoutes from './routes/auth-google';
import studentRoutes from './routes/students';
import gradeRoutes from './routes/grades';
import criteriaRoutes from './routes/criteria';
import yearRoutes from './routes/years';
import groupRoutes from './routes/groups';
import exportRoutes from './routes/export';
import importRoutes from './routes/import';
import teacherRoutes from './routes/teachers';
import adminRoutes from './routes/admin';
import attendanceRoutes from './routes/attendance';
import lessonsRoutes from './routes/lessons';
import groupScheduleSettingsRoutes from './routes/groupScheduleSettings';
import teacherSchedulesRoutes from './routes/teacherSchedules';
import notesRoutes from './routes/notes';
import teacherEarningsRoutes from './routes/teacher-earnings';
import scheduleOverridesRoutes from './routes/schedule-overrides';
import groupCollaboratorsRoutes from './routes/group-collaborators';
import studentCollaboratorsRoutes from './routes/student-collaborators';
import telegramRoutes from './routes/telegram';
import vkRoutes from './routes/vk';
import organizationStatsRoutes from './routes/organization-stats';
import paymentsRoutes from './routes/payments';
import organizationScheduleRoutes from './routes/organization-schedule';
// import subscriptionRoutes from './routes/subscriptions'; // Отключено
import { initTelegramBot } from './services/telegram-bot';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://tutorsdesk.ru',
    /^https:\/\/vk\.com$/,
    /^https:\/\/.*\.vk\.com$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration for Passport
app.use(session({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Initialize Passport
initializePassport();
app.use(passport.initialize());
app.use(passport.session());

app.use('/api/auth', authRoutes);
app.use('/api/auth', authGoogleRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/grades', gradeRoutes);
app.use('/api/criteria', criteriaRoutes);
app.use('/api/years', yearRoutes);
app.use('/api/groups', groupRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/import', importRoutes);
app.use('/api/teachers', teacherRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/group-schedule-settings', groupScheduleSettingsRoutes);
app.use('/api/teacher-schedules', teacherSchedulesRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/teacher-earnings', teacherEarningsRoutes);
app.use('/api/schedule-overrides', scheduleOverridesRoutes);
app.use('/api/group-collaborators', groupCollaboratorsRoutes);
app.use('/api/student-collaborators', studentCollaboratorsRoutes);
app.use('/api/telegram', telegramRoutes);
app.use('/api/vk', vkRoutes);
app.use('/api/organization-stats', organizationStatsRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api/organization-schedule', organizationScheduleRoutes);
// app.use('/api/subscriptions', subscriptionRoutes); // Отключено

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // Инициализация Telegram бота
  initTelegramBot();
});

process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, prisma };