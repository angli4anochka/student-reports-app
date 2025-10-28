import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth';
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

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(helmet());
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://student-reports-app.vercel.app',
    'https://backend2-iota-sand.vercel.app'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
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

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
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