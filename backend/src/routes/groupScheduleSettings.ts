import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// GET /group-schedule-settings - get settings for a group
router.get('/', async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ error: 'groupId is required' });
    }

    const settings = await prisma.groupScheduleSettings.findUnique({
      where: { groupId: groupId as string }
    });

    if (!settings) {
      // Return default: Tuesday and Thursday
      return res.status(200).json({ groupId, weekdays: '2,4' });
    }

    return res.status(200).json(settings);
  } catch (error) {
    console.error('Schedule settings fetch error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /group-schedule-settings - create or update settings
router.post('/', async (req, res) => {
  try {
    const { groupId, weekdays } = req.body;

    if (!groupId || weekdays === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const settings = await prisma.groupScheduleSettings.upsert({
      where: { groupId },
      update: { weekdays },
      create: { groupId, weekdays }
    });

    return res.status(200).json(settings);
  } catch (error) {
    console.error('Schedule settings save error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
