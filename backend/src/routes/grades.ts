import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

// Cache for frequently accessed data
let criteriaCache: any[] | null = null;
let scalesCache: any[] | null = null;
let cacheExpiry = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

router.use(authenticateToken);

const getCachedCriteria = async () => {
  const now = Date.now();
  if (!criteriaCache || now > cacheExpiry) {
    criteriaCache = await prisma.criterion.findMany({
      orderBy: { order: 'asc' }
    });
    cacheExpiry = now + CACHE_DURATION;
  }
  return criteriaCache;
};

const getCachedScales = async () => {
  const now = Date.now();
  if (!scalesCache || now > cacheExpiry) {
    scalesCache = await prisma.gradeScale.findMany({
      orderBy: { minScore: 'desc' }
    });
  }
  return scalesCache;
};

const calculateTotalScore = async (criteriaGrades: Array<{criterionId: string, value: number}>) => {
  const criteria = await getCachedCriteria();
  let totalScore = 0;
  let totalWeight = 0;

  for (const grade of criteriaGrades) {
    const criterion = criteria.find(c => c.id === grade.criterionId);
    if (criterion) {
      totalScore += grade.value * criterion.weight;
      totalWeight += criterion.weight;
    }
  }

  return totalWeight > 0 ? totalScore / totalWeight : 0;
};

const getLetterGrade = async (score: number) => {
  const scales = await getCachedScales();

  for (const scale of scales) {
    if (score >= scale.minScore) {
      return scale.letter;
    }
  }

  return 'F';
};

router.get('/', async (req: AuthRequest, res) => {
  try {
    const { studentId, yearId, month } = req.query;
    
    const where: any = {};

    if (studentId) where.studentId = studentId as string;
    if (yearId) where.yearId = yearId as string;
    if (month) where.month = month as string;

    const grades = await prisma.grade.findMany({
      where,
      include: {
        student: true,
        criteriaGrades: {
          include: {
            criterion: true
          }
        },
        attachments: true
      },
      orderBy: { month: 'asc' }
    });

    res.json(grades);
  } catch (error) {
    console.error('Error fetching grades:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const grade = await prisma.grade.findUnique({
      where: { id },
      include: {
        student: true,
        criteriaGrades: {
          include: {
            criterion: true
          }
        },
        attachments: true
      }
    });

    if (!grade) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    res.json(grade);
  } catch (error) {
    console.error('Error fetching grade:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: AuthRequest, res) => {
  try {
    const {
      studentId,
      yearId,
      month,
      criteria,
      criteriaGrades, // Support both field names
      attendance,
      homework,
      comment,
      recommendations
    } = req.body;

    if (!studentId || !month) {
      return res.status(400).json({ error: 'Student ID and month are required' });
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        teacherId: req.user!.userId
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }

    // Support both 'criteria' and 'criteriaGrades' field names
    const gradesData = criteriaGrades || criteria;
    const totalScore = gradesData ? await calculateTotalScore(gradesData) : 0;
    const letterGrade = totalScore > 0 ? await getLetterGrade(totalScore) : null;

    const grade = await prisma.grade.upsert({
      where: {
        studentId_month: {
          studentId,
          month
        }
      },
      update: {
        yearId,
        attendance: attendance || null,
        homework: homework || null,
        comment: comment || null,
        recommendations: recommendations || null,
        totalScore,
        grade: letterGrade
      },
      create: {
        studentId,
        yearId,
        month,
        attendance: attendance || null,
        homework: homework || null,
        comment: comment || null,
        recommendations: recommendations || null,
        totalScore,
        grade: letterGrade
      },
      include: {
        criteriaGrades: true
      }
    });

    if (gradesData && gradesData.length > 0) {
      await prisma.criterionGrade.deleteMany({
        where: { gradeId: grade.id }
      });

      await prisma.criterionGrade.createMany({
        data: gradesData.map((c: any) => ({
          gradeId: grade.id,
          criterionId: c.criterionId,
          value: c.value
        }))
      });
    }

    const updatedGrade = await prisma.grade.findUnique({
      where: { id: grade.id },
      include: {
        student: true,
        criteriaGrades: {
          include: {
            criterion: true
          }
        },
        attachments: true
      }
    });

    res.json(updatedGrade);
  } catch (error) {
    console.error('Error creating/updating grade:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existingGrade = await prisma.grade.findUnique({
      where: { id },
      include: { student: true }
    });

    if (!existingGrade) {
      return res.status(404).json({ error: 'Grade not found' });
    }

    const student = await prisma.student.findFirst({
      where: {
        id: existingGrade.studentId,
        teacherId: req.user!.userId
      }
    });

    if (!student) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await prisma.grade.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting grade:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;