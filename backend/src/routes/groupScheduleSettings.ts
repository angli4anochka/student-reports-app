import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Get group schedule settings
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { groupId } = req.query;

    if (!groupId) {
      return res.status(400).json({ error: 'groupId is required' });
    }

    const settings = await prisma.groupScheduleSettings.findUnique({
      where: {
        groupId: groupId as string
      }
    });

    if (!settings) {
      // Return default settings if none exist
      return res.json({
        groupId,
        weekdays: '2,4' // Default: Tuesday and Thursday
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error fetching group schedule settings:', error);
    res.status(500).json({ error: 'Failed to fetch group schedule settings' });
  }
});

// Save group schedule settings
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { groupId, weekdays } = req.body;

    if (!groupId || !weekdays) {
      return res.status(400).json({ error: 'groupId and weekdays are required' });
    }

    // Check if settings already exist
    const existing = await prisma.groupScheduleSettings.findUnique({
      where: { groupId }
    });

    let settings;
    if (existing) {
      // Update existing settings
      settings = await prisma.groupScheduleSettings.update({
        where: { groupId },
        data: { weekdays }
      });
    } else {
      // Create new settings
      settings = await prisma.groupScheduleSettings.create({
        data: {
          groupId,
          weekdays
        }
      });
    }

    res.json(settings);
  } catch (error) {
    console.error('Error saving group schedule settings:', error);
    res.status(500).json({ error: 'Failed to save group schedule settings' });
  }
});

export default router;
