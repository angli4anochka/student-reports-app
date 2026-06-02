import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// Create a payment record
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { studentId, amount, lessonsCount, paymentDate, notes } = req.body;
    const userId = req.user!.userId;

    if (!studentId || !amount || !lessonsCount || !paymentDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get current user info
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, role: true }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify student exists and check access
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        OR: [
          { teacherId: userId }, // Own student
          // Admin can add payments for ANY student in their organization
          ...(currentUser.role === 'ADMIN' || currentUser.role === 'SCHOOL_MANAGER' ? [{
            organizationId: currentUser.organizationId
          }] : [])
        ]
      },
      select: {
        id: true,
        teacherId: true,
        lessonsBalance: true,
        fullName: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found or access denied' });
    }

    const pricePerLesson = parseFloat(amount) / parseInt(lessonsCount);

    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        studentId,
        teacherId: student.teacherId, // Payment goes to student's assigned teacher
        amount: parseFloat(amount),
        lessonsCount: parseInt(lessonsCount),
        pricePerLesson,
        paymentDate: new Date(paymentDate),
        notes: notes || null
      }
    });

    // Update student's lessons balance
    const newBalance = (student.lessonsBalance || 0) + parseInt(lessonsCount);
    await prisma.student.update({
      where: { id: studentId },
      data: {
        lessonsBalance: newBalance,
        lessonsBalanceUpdatedAt: new Date()
      }
    });

    res.status(201).json({
      ...payment,
      newBalance,
      studentName: student.fullName
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get payment history
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { studentId } = req.query;
    const userId = req.user!.userId;

    // Get current user info
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, role: true }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    let where: any = {};

    if (studentId) {
      // Verify access to this student
      const student = await prisma.student.findFirst({
        where: {
          id: studentId as string,
          OR: [
            { teacherId: userId },
            { sharedTeachers: { some: { teacherId: userId } } },
            ...(currentUser.role === 'ADMIN' || currentUser.role === 'SCHOOL_MANAGER' ? [{
              organizationId: currentUser.organizationId
            }] : [])
          ]
        }
      });

      if (!student) {
        return res.status(403).json({ error: 'Access denied to this student' });
      }

      where.studentId = studentId as string;
    } else {
      // Show all payments for teacher's students or organization (for admin)
      if (currentUser.role === 'ADMIN' || currentUser.role === 'SCHOOL_MANAGER') {
        // Admin sees payments for ALL students in organization
        const orgStudents = await prisma.student.findMany({
          where: {
            organizationId: currentUser.organizationId
          },
          select: { id: true }
        });
        where.studentId = { in: orgStudents.map(s => s.id) };
      } else {
        // Teacher sees payments for their students
        where.teacherId = userId;
      }
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            fullName: true,
            lessonsBalance: true
          }
        }
      },
      orderBy: { paymentDate: 'desc' }
    });

    res.json(payments);
  } catch (error) {
    console.error('Error fetching payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get student balance info
router.get('/balance/:studentId', async (req: AuthRequest, res) => {
  try {
    const { studentId } = req.params;
    const userId = req.user!.userId;

    // Get current user info
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { organizationId: true, role: true }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify access
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        OR: [
          { teacherId: userId },
          { sharedTeachers: { some: { teacherId: userId } } },
          ...(currentUser.role === 'ADMIN' || currentUser.role === 'SCHOOL_MANAGER' ? [{
            organizationId: currentUser.organizationId
          }] : [])
        ]
      },
      select: {
        id: true,
        fullName: true,
        lessonsBalance: true,
        lessonsBalanceUpdatedAt: true
      }
    });

    if (!student) {
      return res.status(404).json({ error: 'Student not found or access denied' });
    }

    // Get total payments
    const payments = await prisma.payment.findMany({
      where: { studentId },
      select: {
        lessonsCount: true,
        amount: true
      }
    });

    const totalPaid = payments.reduce((sum, p) => sum + parseFloat(p.amount.toString()), 0);
    const totalLessonsPaid = payments.reduce((sum, p) => sum + p.lessonsCount, 0);

    res.json({
      studentId: student.id,
      studentName: student.fullName,
      currentBalance: student.lessonsBalance || 0,
      lastUpdated: student.lessonsBalanceUpdatedAt,
      totalPaid,
      totalLessonsPaid,
      paymentCount: payments.length
    });
  } catch (error) {
    console.error('Error fetching balance:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
