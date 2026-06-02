import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

/**
 * API для управления недельными переопределениями расписания
 *
 * Позволяет перемещать уроки на другие дни/время для конкретных недель
 * без изменения базового расписания
 *
 * POST   /api/schedule-overrides - Создать/обновить переопределение
 * DELETE /api/schedule-overrides/:id - Удалить переопределение
 */

// POST /api/schedule-overrides - Создать или обновить переопределение
router.post('/', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const { scheduleSlotId, weekStart, newDayOfWeek, newTime} = req.body;

  // Валидация входных данных
  if (!scheduleSlotId || !weekStart || newDayOfWeek === undefined || !newTime) {
    return res.status(400).json({
      error: 'Missing required fields: scheduleSlotId, weekStart, newDayOfWeek, newTime'
    });
  }

  // Проверка, что newDayOfWeek в диапазоне 0-6
  if (newDayOfWeek < 0 || newDayOfWeek > 6) {
    return res.status(400).json({
      error: 'newDayOfWeek must be between 0 (Monday) and 6 (Sunday)'
    });
  }

  // Проверка формата времени (HH:MM)
  const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(newTime)) {
    return res.status(400).json({
      error: 'newTime must be in HH:MM format (e.g., 14:30)'
    });
  }

  // ✅ Валидация: weekStart должен быть понедельником
  const weekStartDate = new Date(weekStart);
  const dayOfWeek = weekStartDate.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
  if (dayOfWeek !== 1) {
    return res.status(400).json({
      error: `weekStart must be a Monday. Received: ${weekStart} (day ${dayOfWeek})`,
      hint: 'Use format YYYY-MM-DD where DD is a Monday'
    });
  }

  try {
    // Проверка владения слотом расписания
    const slot = await prisma.personalScheduleSlot.findUnique({
      where: { id: scheduleSlotId }
    });

    if (!slot || slot.teacherId !== userId) {
      return res.status(404).json({ error: 'Schedule slot not found or access denied' });
    }

    // Создаем или обновляем переопределение (upsert)
    // Unique constraint по (scheduleSlotId, weekStart) гарантирует, что будет только одно переопределение на неделю
    const override = await prisma.scheduleOverride.upsert({
      where: {
        scheduleSlotId_weekStart: {
          scheduleSlotId,
          weekStart: weekStartDate  // Use Date object instead of string
        }
      },
      update: {
        newDayOfWeek,
        newTime,
        isActive: true
      },
      create: {
        scheduleSlotId,
        weekStart: weekStartDate,  // Use Date object instead of string
        newDayOfWeek,
        newTime,
        isActive: true
      }
    });

    return res.json({
      success: true,
      override,
      message: `Schedule override created/updated for week ${weekStart}`
    });
  } catch (error) {
    console.error('Error creating schedule override:', error);
    return res.status(500).json({ error: 'Failed to create schedule override' });
  }
});

// DELETE /api/schedule-overrides/:id - Удалить переопределение
router.delete('/:id', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const { id } = req.params;

  try {
    // Получаем переопределение
    const override = await prisma.scheduleOverride.findUnique({
      where: { id },
      include: {
        scheduleSlot: true
      }
    });

    if (!override) {
      return res.status(404).json({ error: 'Override not found' });
    }

    // Проверка владения слотом расписания
    if (override.scheduleSlot.teacherId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Удаляем переопределение
    await prisma.scheduleOverride.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: 'Schedule override removed'
    });
  } catch (error) {
    console.error('Error deleting schedule override:', error);
    return res.status(500).json({ error: 'Failed to delete schedule override' });
  }
});

// DELETE /api/schedule-overrides/by-slot/:scheduleSlotId/:weekStart - Удалить переопределение по слоту и неделе
router.delete('/by-slot/:scheduleSlotId/:weekStart', authenticateToken, async (req: AuthRequest, res) => {
  const userId = req.user!.userId;
  const { scheduleSlotId, weekStart } = req.params;

  try {
    // Проверка владения слотом расписания
    const slot = await prisma.personalScheduleSlot.findUnique({
      where: { id: scheduleSlotId }
    });

    if (!slot || slot.teacherId !== userId) {
      return res.status(404).json({ error: 'Schedule slot not found or access denied' });
    }

    // Convert weekStart string to Date object
    const weekStartDate = new Date(weekStart);

    // Удаляем переопределение
    const result = await prisma.scheduleOverride.deleteMany({
      where: {
        scheduleSlotId,
        weekStart: weekStartDate  // Use Date object instead of string
      }
    });

    if (result.count === 0) {
      return res.status(404).json({ error: 'Override not found for this slot and week' });
    }

    return res.json({
      success: true,
      message: `Schedule override removed for week ${weekStart}`
    });
  } catch (error) {
    console.error('Error deleting schedule override:', error);
    return res.status(500).json({ error: 'Failed to delete schedule override' });
  }
});

export default router;
