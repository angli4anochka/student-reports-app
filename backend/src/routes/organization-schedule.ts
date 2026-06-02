import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// Get consolidated schedule for all teachers in organization (Admin only)
router.get('/', async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.userId;

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        organizationId: true,
        role: true
      }
    });

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Only admins can see organization-wide schedule
    if (currentUser.role !== 'ADMIN' && currentUser.role !== 'SCHOOL_MANAGER') {
      return res.status(403).json({ error: 'Access denied. Admin only.' });
    }

    if (!currentUser.organizationId) {
      return res.status(400).json({ error: 'No organization found' });
    }

    // Get all teachers in the organization
    const teachers = await prisma.user.findMany({
      where: {
        organizationId: currentUser.organizationId,
        role: 'TEACHER'
      },
      select: {
        id: true,
        fullName: true,
        email: true
      },
      orderBy: {
        fullName: 'asc'
      }
    });

    // Get all schedule slots for these teachers
    const teacherIds = teachers.map(t => t.id);
    const allSlots = await prisma.personalScheduleSlot.findMany({
      where: {
        teacherId: { in: teacherIds }
      },
      include: {
        lessonType: {
          select: {
            id: true,
            name: true,
            color: true,
            pricePerHour: true
          }
        }
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { time: 'asc' }
      ]
    });

    // Get ALL students in organization that are either:
    // - Non-personal (isPersonal=false)
    // - Shared with ANYONE in the organization
    const allStudents = await prisma.student.findMany({
      where: {
        organizationId: currentUser.organizationId
      },
      select: {
        id: true,
        fullName: true,
        isPersonal: true,
        sharedTeachers: {
          select: { teacherId: true }
        }
      }
    });

    // Filter: only non-personal students OR students shared with anyone
    const visibleStudents = allStudents.filter(s =>
      !s.isPersonal || s.sharedTeachers.length > 0
    );
    const visibleStudentMap = new Map(visibleStudents.map(s => [s.id, s]));

    // Get ALL groups in organization that are shared with ANYONE
    const allGroups = await prisma.group.findMany({
      where: {
        organizationId: currentUser.organizationId
      },
      select: {
        id: true,
        name: true,
        collaborators: {
          select: { teacherId: true }
        }
      }
    });

    // Filter: only groups that are shared with at least one person
    const visibleGroups = allGroups.filter(g => g.collaborators.length > 0);
    const visibleGroupMap = new Map(visibleGroups.map(g => [g.id, g]));

    // Filter slots: only show slots with visible students/groups
    const scheduleSlots = allSlots.filter(slot => {
      // If slot has a student, check if student is visible
      if (slot.studentId) {
        return visibleStudentMap.has(slot.studentId);
      }

      // If slot has a group, check if group is visible
      if (slot.groupId) {
        return visibleGroupMap.has(slot.groupId);
      }

      // If no student and no group, skip
      return false;
    }).map(slot => {
      // Add student/group info
      const student = slot.studentId ? visibleStudentMap.get(slot.studentId) : null;
      const group = slot.groupId ? visibleGroupMap.get(slot.groupId) : null;

      return {
        ...slot,
        student: student ? { id: student.id, fullName: student.fullName } : null,
        group: group ? { id: group.id, name: group.name } : null
      };
    });

    // Group slots by teacher
    const scheduleByTeacher: Record<string, any[]> = {};
    teachers.forEach(teacher => {
      scheduleByTeacher[teacher.id] = scheduleSlots.filter(
        slot => slot.teacherId === teacher.id
      );
    });

    // Return teachers and their schedules
    res.json({
      teachers: teachers.map(t => ({
        id: t.id,
        fullName: t.fullName,
        email: t.email,
        schedule: scheduleByTeacher[t.id] || []
      }))
    });

  } catch (error) {
    console.error('Error fetching organization schedule:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
