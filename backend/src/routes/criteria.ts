import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const criteria = await prisma.criterion.findMany({
      orderBy: { order: 'asc' }
    });

    res.json(criteria);
  } catch (error) {
    console.error('Error fetching criteria:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const criterion = await prisma.criterion.findUnique({
      where: { id }
    });

    if (!criterion) {
      return res.status(404).json({ error: 'Criterion not found' });
    }

    res.json(criterion);
  } catch (error) {
    console.error('Error fetching criterion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, weight, scale, order } = req.body;

    if (!name || weight === undefined || !scale) {
      return res.status(400).json({ error: 'Name, weight, and scale are required' });
    }

    if (weight < 0 || weight > 1) {
      return res.status(400).json({ error: 'Weight must be between 0 and 1' });
    }

    const criterion = await prisma.criterion.create({
      data: {
        name,
        weight: parseFloat(weight),
        scale,
        order: order || 0
      }
    });

    res.status(201).json(criterion);
  } catch (error) {
    console.error('Error creating criterion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, weight, scale, order } = req.body;

    const existingCriterion = await prisma.criterion.findUnique({
      where: { id }
    });

    if (!existingCriterion) {
      return res.status(404).json({ error: 'Criterion not found' });
    }

    if (weight !== undefined && (weight < 0 || weight > 1)) {
      return res.status(400).json({ error: 'Weight must be between 0 and 1' });
    }

    const criterion = await prisma.criterion.update({
      where: { id },
      data: {
        name: name || existingCriterion.name,
        weight: weight !== undefined ? parseFloat(weight) : existingCriterion.weight,
        scale: scale || existingCriterion.scale,
        order: order !== undefined ? order : existingCriterion.order
      }
    });

    res.json(criterion);
  } catch (error) {
    console.error('Error updating criterion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existingCriterion = await prisma.criterion.findUnique({
      where: { id }
    });

    if (!existingCriterion) {
      return res.status(404).json({ error: 'Criterion not found' });
    }

    await prisma.criterion.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting criterion:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;