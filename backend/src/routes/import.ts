import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.post('/excel', async (req: AuthRequest, res) => {
  try {
    res.json({ message: 'Excel import not implemented yet' });
  } catch (error) {
    console.error('Error importing from Excel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;