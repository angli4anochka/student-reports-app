import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/excel', async (req: AuthRequest, res) => {
  try {
    res.json({ message: 'Excel export not implemented yet' });
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/pdf', async (req: AuthRequest, res) => {
  try {
    res.json({ message: 'PDF export not implemented yet' });
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;