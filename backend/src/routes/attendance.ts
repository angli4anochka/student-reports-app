import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const { studentId, groupId, dateFrom, dateTo } = req.query;
    const userId = (req as any).user?.userId;

    const where: any = {
      teacherId: userId
    };

    if (studentId) {
      where.studentId = studentId as string;
    }

    if (groupId) {
      where.groupId = groupId as string;
    }

    let attendance = await prisma.attendance.findMany({
      where,
      orderBy: { date: 'desc' }
    });

    if (dateFrom || dateTo) {
      attendance = attendance.filter((record: any) => {
        if (dateFrom && record.date < dateFrom) return false;
        if (dateTo && record.date > dateTo) return false;
        return true;
      });
    }

    return res.status(200).json(attendance);
  } catch (error) {
    console.error('Attendance fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { studentId, date, status, groupId } = req.body;
    const userId = (req as any).user?.userId;

    if (!studentId || !date || !status) {
      return res.status(400).json({ error: 'Missing required fields' });
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

router.delete('/', async (req, res) => {
  try {
    const { studentId, date } = req.query;
    const userId = (req as any).user?.userId;

    if (!studentId || !date) {
      return res.status(400).json({ error: 'Missing studentId or date' });
    }

    await prisma.attendance.deleteMany({
      where: {
        studentId: studentId as string,
        date: date as string,
        teacherId: userId
      }
    });

    return res.status(200).json({ message: 'Attendance record deleted' });
  } catch (error) {
    console.error('Attendance delete error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
