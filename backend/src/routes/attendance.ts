import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Добавляем middleware авторизации для всех маршрутов
router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { studentId, groupId, dateFrom, dateTo } = req.query;
    const userId = req.user!.userId;

    // Получаем данные пользователя для проверки организации
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, role: true }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    let where: any = {};

    // Изоляция по организациям
    if (studentId) {
      // Конкретный студент - проверяем доступ
      const student = await prisma.student.findFirst({
        where: {
          id: studentId as string,
          OR: currentUser.organizationId
            ? [{ organizationId: currentUser.organizationId }]
            : [
                { teacherId: userId },
                { group: { collaborators: { some: { teacherId: userId } } } },
                { sharedTeachers: { some: { teacherId: userId } } }
              ]
        }
      });

      if (!student) {
        return res.status(403).json({ error: 'Access denied to this student' });
      }

      where.studentId = studentId as string;
    } else if (groupId) {
      console.log('Attendance API - loading for groupId:', groupId);

      // Проверяем доступ к группе
      const group = await prisma.group.findFirst({
        where: {
          id: groupId as string,
          OR: currentUser.organizationId
            ? [{ organizationId: currentUser.organizationId }]
            : [
                { teacherId: userId },
                { collaborators: { some: { teacherId: userId } } }
              ]
        }
      });

      if (!group) {
        return res.status(403).json({ error: 'Access denied to this group' });
      }

      // Get all students in this group
      const groupStudents = await prisma.student.findMany({
        where: { groupId: groupId as string },
        select: { id: true }
      });

      console.log('Attendance API - students in group:', groupStudents.length);

      if (groupStudents.length > 0) {
        where.studentId = { in: groupStudents.map(s => s.id) };
      } else {
        where.studentId = 'none';
      }
    } else {
      // Все записи посещаемости
      if (currentUser.organizationId) {
        // Пользователь в организации - посещаемость всех студентов организации
        const orgStudents = await prisma.student.findMany({
          where: { organizationId: currentUser.organizationId },
          select: { id: true }
        });
        where.studentId = { in: orgStudents.map(s => s.id) };
      } else {
        // Индивидуальный репетитор - только свои студенты
        where.teacherId = userId;
      }
    }

    let attendance = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    console.log('Attendance API - before date filter:', attendance.length, 'records');

    if (dateFrom || dateTo) {
      attendance = attendance.filter((record: any) => {
        if (dateFrom && record.date < dateFrom) return false;
        if (dateTo && record.date > dateTo) return false;
        return true;
      });
    }

    console.log('Attendance API - after date filter:', attendance.length, 'records');
    return res.status(200).json(attendance);
  } catch (error) {
    console.error('Attendance fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { studentId, date, status, groupId } = req.body;
    const userId = req.user!.userId;

    if (!studentId || !date || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Получаем данные пользователя для проверки организации
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, role: true }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверяем доступ к студенту
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        OR: currentUser.organizationId
          ? [{ organizationId: currentUser.organizationId }]
          : [
              { teacherId: userId },
              { group: { collaborators: { some: { teacherId: userId } } } },
              { sharedTeachers: { some: { teacherId: userId } } }
            ]
      }
    });

    if (!student) {
      return res.status(403).json({ error: 'Access denied to this student' });
    }

    const attendance = await prisma.attendance.upsert({
      where: {
        studentId_date: {
          studentId,
          date
        }
      },
      update: {
        status,
        groupId: groupId || null,
        teacherId: userId
      },
      create: {
        studentId,
        date,
        status,
        teacherId: userId,
        groupId: groupId || null
      }
    });

    return res.status(200).json(attendance);
  } catch (error) {
    console.error('Attendance create error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/', async (req: AuthRequest, res) => {
  try {
    const { studentId, date } = req.query;
    const userId = req.user!.userId;

    if (!studentId || !date) {
      return res.status(400).json({ error: 'Missing studentId or date' });
    }

    // Получаем данные пользователя для проверки организации
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, role: true }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Проверяем доступ к студенту перед удалением
    const student = await prisma.student.findFirst({
      where: {
        id: studentId as string,
        OR: currentUser.organizationId
          ? [{ organizationId: currentUser.organizationId }]
          : [
              { teacherId: userId },
              { group: { collaborators: { some: { teacherId: userId } } } },
              { sharedTeachers: { some: { teacherId: userId } } }
            ]
      }
    });

    if (!student) {
      return res.status(403).json({ error: 'Access denied to this student' });
    }

    await prisma.attendance.deleteMany({
      where: {
        studentId: studentId as string,
        date: date as string
      }
    });

    return res.status(200).json({ message: 'Attendance record deleted' });
  } catch (error) {
    console.error('Attendance delete error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
