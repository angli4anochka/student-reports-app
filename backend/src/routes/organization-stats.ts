import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// GET /organization-stats - Get organization overview (SCHOOL_MANAGER only)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    // Get current user and verify they're in an organization
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        organizationId: true,
        role: true,
        organization: {
          select: {
            id: true,
            name: true,
            type: true
          }
        }
      }
    });

    if (!currentUser || !currentUser.organizationId) {
      return res.status(403).json({ error: 'Only organization members can access this endpoint' });
    }

    if (currentUser.role !== 'SCHOOL_MANAGER' && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only SCHOOL_MANAGER or ADMIN can access organization stats' });
    }

    const orgId = currentUser.organizationId;

    // Get staff members
    const staff = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        fullName: true,
        email: true,
        role: true,
        createdAt: true
      },
      orderBy: { fullName: 'asc' }
    });

    // Get total counts
    const [studentsCount, groupsCount, lessonsCount] = await Promise.all([
      prisma.student.count({ where: { organizationId: orgId } }),
      prisma.group.count({ where: { organizationId: orgId } }),
      prisma.lesson.count({ where: { organizationId: orgId } })
    ]);

    // Get all students in the organization
    const students = await prisma.student.findMany({
      where: { organizationId: orgId },
      include: {
        group: {
          select: {
            id: true,
            name: true
          }
        },
        teacher: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: { fullName: 'asc' }
    });

    // Get all groups in the organization
    const groups = await prisma.group.findMany({
      where: { organizationId: orgId },
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        _count: {
          select: { students: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Get financial summary for the current month
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthStartStr = currentMonthStart.toISOString().split('T')[0];

    // Get all schedule slots for the organization
    const orgScheduleSlots = await prisma.$queryRaw<any[]>`
      SELECT s.*, u."fullName" as teacher_name, u.email as teacher_email
      FROM personal_schedule_slots s
      JOIN users u ON s."teacherId" = u.id
      WHERE u."organizationId" = ${orgId}
    `;

    // Get completed lessons (payments) for current month
    const monthlyPayments = await prisma.$queryRaw<any[]>`
      SELECT
        cl.*,
        u."fullName" as teacher_name,
        u.email as teacher_email,
        pss."studentName"
      FROM completed_lessons cl
      JOIN personal_schedule_slots pss ON cl."scheduleSlotId" = pss.id
      JOIN users u ON pss."teacherId" = u.id
      WHERE u."organizationId" = ${orgId}
        AND cl."weekStart" >= ${currentMonthStartStr}
      ORDER BY cl."weekStart" DESC, u."fullName"
    `;

    // Calculate financial summary by teacher
    const financialByTeacher = monthlyPayments.reduce((acc: any, payment: any) => {
      const teacherId = payment.teacherId;
      if (!acc[teacherId]) {
        acc[teacherId] = {
          teacherId,
          teacherName: payment.teacher_name,
          teacherEmail: payment.teacher_email,
          totalLessons: 0,
          completedLessons: 0,
          paidLessons: 0,
          unpaidLessons: 0
        };
      }

      acc[teacherId].totalLessons++;
      if (payment.completed) acc[teacherId].completedLessons++;
      if (payment.paid) acc[teacherId].paidLessons++;
      if (payment.completed && !payment.paid) acc[teacherId].unpaidLessons++;

      return acc;
    }, {});

    // Get recent activity (last 10 lessons created)
    const recentLessons = await prisma.lesson.findMany({
      where: { organizationId: orgId },
      include: {
        teacher: {
          select: {
            id: true,
            fullName: true,
            email: true
          }
        },
        student: {
          select: {
            id: true,
            fullName: true
          }
        },
        group: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    // Get attendance summary for current month
    const monthlyAttendance = await prisma.$queryRaw<any[]>`
      SELECT
        COUNT(*) as total_records,
        COUNT(*) FILTER (WHERE status = 'PRESENT') as present_count,
        COUNT(*) FILTER (WHERE status = 'ABSENT') as absent_count,
        COUNT(DISTINCT a."studentId") as unique_students
      FROM attendance a
      JOIN students s ON a."studentId" = s.id
      WHERE s."organizationId" = ${orgId}
        AND a.date >= ${currentMonthStartStr}
    `;

    const response = {
      organization: currentUser.organization,
      summary: {
        totalStudents: studentsCount,
        totalGroups: groupsCount,
        totalLessons: lessonsCount,
        totalStaff: staff.length
      },
      staff,
      students,
      groups,
      scheduleSlots: orgScheduleSlots,
      financial: {
        currentMonth: {
          start: currentMonthStartStr,
          byTeacher: Object.values(financialByTeacher),
          totalPayments: monthlyPayments.length,
          totalCompleted: monthlyPayments.filter((p: any) => p.completed).length,
          totalPaid: monthlyPayments.filter((p: any) => p.paid).length
        },
        recentPayments: monthlyPayments.slice(0, 20)
      },
      attendance: {
        currentMonth: monthlyAttendance[0] || {
          total_records: 0,
          present_count: 0,
          absent_count: 0,
          unique_students: 0
        }
      },
      recentActivity: recentLessons
    };

    return res.json(response);
  } catch (error) {
    console.error('Organization stats error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
