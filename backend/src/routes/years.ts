import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

const DEFAULT_MONTHS = [
  'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь', 
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь'
];

router.get('/', async (req: AuthRequest, res) => {
  try {
    const years = await prisma.year.findMany({
      where: {
        createdBy: req.user!.userId
      },
      orderBy: { year: 'desc' }
    });

    res.json(years);
  } catch (error) {
    console.error('Error fetching years:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const year = await prisma.year.findFirst({
      where: {
        id,
        createdBy: req.user!.userId
      }
    });

    if (!year) {
      return res.status(404).json({ error: 'Year not found' });
    }

    res.json(year);
  } catch (error) {
    console.error('Error fetching year:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { year, months } = req.body;

    if (!year) {
      return res.status(400).json({ error: 'Year is required' });
    }

    const yearData = await prisma.year.create({
      data: {
        year,
        months: JSON.stringify(months || DEFAULT_MONTHS),
        createdBy: req.user!.userId
      }
    });

    res.status(201).json(yearData);
  } catch (error) {
    console.error('Error creating year:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { year, months } = req.body;

    const existingYear = await prisma.year.findFirst({
      where: {
        id,
        createdBy: req.user!.userId
      }
    });

    if (!existingYear) {
      return res.status(404).json({ error: 'Year not found' });
    }

    const updatedYear = await prisma.year.update({
      where: { id },
      data: {
        year: year || existingYear.year,
        months: months ? JSON.stringify(months) : existingYear.months
      }
    });

    res.json(updatedYear);
  } catch (error) {
    console.error('Error updating year:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existingYear = await prisma.year.findFirst({
      where: {
        id,
        createdBy: req.user!.userId
      }
    });

    if (!existingYear) {
      return res.status(404).json({ error: 'Year not found' });
    }

    await prisma.year.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting year:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;