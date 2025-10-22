import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get attendance records
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { studentId, groupId, dateFrom, dateTo } = req.query;

    const filters: any = {};

    if (studentId) {
      filters.studentId = studentId as string;
    }

    if (groupId) {
      filters.groupId = groupId as string;
    }

    // Date filtering if provided
    if (dateFrom || dateTo) {
      filters.date = {};
      if (dateFrom) {
        filters.date.gte = dateFrom as string;
      }
      if (dateTo) {
        filters.date.lte = dateTo as string;
      }
    }

    const attendance = await prisma.attendance.findMany({
      where: filters,
      include: {
        student: {
          select: {
            fullName: true
          }
        }
      },
      orderBy: {
        date: 'asc'
      }
    });

    res.json(attendance);
  } catch (error) {
    console.error('Error fetching attendance:', error);
    res.status(500).json({ error: 'Failed to fetch attendance records' });
  }
});

// Save or update attendance
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { studentId, date, status, groupId } = req.body;

    if (!studentId || !date || !status) {
      return res.status(400).json({ error: 'studentId, date, and status are required' });
    }

    // Check if record exists
    const existing = await prisma.attendance.findUnique({
      where: {
        studentId_date: {
          studentId,
          date
        }
      }
    });

    let attendance;
    if (existing) {
      // Update existing record
      attendance = await prisma.attendance.update({
        where: {
          studentId_date: {
            studentId,
            date
          }
        },
        data: {
          status,
          groupId
        }
      });
    } else {
      // Create new record
      attendance = await prisma.attendance.create({
        data: {
          studentId,
          date,
          status,
          groupId
        }
      });
    }

    res.json(attendance);
  } catch (error) {
    console.error('Error saving attendance:', error);
    res.status(500).json({ error: 'Failed to save attendance' });
  }
});

// Delete attendance record
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const { studentId, date } = req.query;

    if (!studentId || !date) {
      return res.status(400).json({ error: 'studentId and date are required' });
    }

    await prisma.attendance.delete({
      where: {
        studentId_date: {
          studentId: studentId as string,
          date: date as string
        }
      }
    });

    res.status(204).send();
  } catch (error: any) {
    if (error.code === 'P2025') {
      // Record not found
      res.status(404).json({ error: 'Attendance record not found' });
    } else {
      console.error('Error deleting attendance:', error);
      res.status(500).json({ error: 'Failed to delete attendance' });
    }
  }
});

export default router;
