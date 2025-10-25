import express from 'express';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

router.get('/', async (req, res) => {
  try {
    const teachers = await prisma.$queryRaw<any[]>`
      SELECT id, email, "fullName", role
      FROM users
      WHERE role = 'TEACHER'
      ORDER BY "fullName" ASC
    `;

    return res.status(200).json(teachers);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
