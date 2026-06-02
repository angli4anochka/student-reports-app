import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /teacher-schedules - get all schedules for a teacher
router.get('/', async (req, res) => {
  try {
    const { teacherId } = req.query;

    if (!teacherId) {
      return res.status(400).json({ error: 'teacherId is required' });
    }

    const schedules = await prisma.teacherSchedule.findMany({
      where: { teacherId: teacherId as string },
      orderBy: [{ day: 'asc' }, { time: 'asc' }]
    });

    return res.status(200).json(schedules);
  } catch (error) {
    console.error('Teacher schedules fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /teacher-schedules - create or update a schedule slot
router.post('/', async (req, res) => {
  try {
    const { teacherId, day, time, groupName } = req.body;

    if (!teacherId || day === undefined || !time) {
      return res.status(400).json({ error: 'Missing required fields: teacherId, day, time' });
    }

    // If groupName is empty, delete the schedule slot
    if (!groupName || groupName.trim() === '') {
      await prisma.teacherSchedule.deleteMany({
        where: { teacherId, day, time }
      });
      return res.status(200).json({ message: 'Schedule slot deleted' });
    }

    // Create or update the schedule slot
    const schedule = await prisma.teacherSchedule.upsert({
      where: {
        teacherId_day_time: {
          teacherId,
          day,
          time
        }
      },
      update: { groupName: groupName.trim() },
      create: {
        teacherId,
        day,
        time,
        groupName: groupName.trim()
      }
    });

    return res.status(200).json(schedule);
  } catch (error) {
    console.error('Teacher schedule save error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /teacher-schedules - delete a schedule slot
router.delete('/', async (req, res) => {
  try {
    const { teacherId, day, time } = req.query;

    if (!teacherId || day === undefined || !time) {
      return res.status(400).json({ error: 'Missing required fields: teacherId, day, time' });
    }

    await prisma.teacherSchedule.deleteMany({
      where: {
        teacherId: teacherId as string,
        day: parseInt(day as string),
        time: time as string
      }
    });

    return res.status(200).json({ message: 'Schedule slot deleted' });
  } catch (error) {
    console.error('Teacher schedule delete error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
