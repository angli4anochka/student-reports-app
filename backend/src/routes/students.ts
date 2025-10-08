import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { groupId, q } = req.query;
    console.log('Students API called with params:', { groupId, q });
    
    const where: any = {
      teacherId: req.user!.userId
    };

    if (groupId) {
      where.groupId = groupId;
    }

    if (q) {
      where.fullName = {
        contains: q as string,
        mode: 'insensitive'
      };
    }

    const students = await prisma.student.findMany({
      where,
      include: {
        group: true,
        _count: {
          select: { grades: true }
        }
      },
      orderBy: { fullName: 'asc' }
    });

    res.json(students);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const student = await prisma.student.findFirst({
      where: {
        id,
        teacherId: req.user!.userId
      },
      include: {
        group: true,
        grades: {
          include: {
            criteriaGrades: {
              include: {
                criterion: true
              }
            },
            attachments: true
          },
          orderBy: { month: 'asc' }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    res.json(student);
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const { fullName, groupId, notes } = req.body;

    if (!fullName || !groupId) {
      return res.status(400).json({ error: 'Full name and group are required' });
    }

    const student = await prisma.student.create({
      data: {
        fullName,
        groupId,
        notes: notes || null,
        teacherId: req.user!.userId
      },
      include: {
        group: true
      }
    });

    res.status(201).json(student);
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { fullName, groupId, notes } = req.body;

    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        teacherId: req.user!.userId
      }
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        fullName: fullName || existingStudent.fullName,
        groupId: groupId || existingStudent.groupId,
        notes: notes !== undefined ? notes : existingStudent.notes
      },
      include: {
        group: true
      }
    });

    res.json(student);
  } catch (error) {
    console.error('Error updating student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existingStudent = await prisma.student.findFirst({
      where: {
        id,
        teacherId: req.user!.userId
      }
    });

    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' });
    }

    await prisma.student.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting student:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;