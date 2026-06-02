import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: string;
  email: string;
}

const verifyToken = (token: string): JWTPayload => {
  return jwt.verify(token, JWT_SECRET) as JWTPayload;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Verify authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);
  let userId: string;

  try {
    const payload = verifyToken(token);
    userId = payload.userId;
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const { entity } = req.query;
    console.log('Teacher earnings API - entity:', entity, 'method:', req.method, 'userId:', userId);

    // Route to different handlers based on entity type
    if (entity === 'lessonTypes') {
      return await handleLessonTypes(req, res, userId);
    } else if (entity === 'schedule') {
      return await handleSchedule(req, res, userId);
    } else if (entity === 'completed') {
      return await handleCompleted(req, res, userId);
    } else if (entity === 'weekEarnings') {
      return await handleWeekEarnings(req, res, userId);
    } else {
      return res.status(400).json({ error: 'Invalid entity type' });
    }
  } catch (error) {
    console.error('Teacher earnings API error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
    });
  }
}

// Handler for Lesson Types (CRUD) - using raw SQL
async function handleLessonTypes(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const { id } = req.query;

    if (req.method === 'GET') {
      if (id) {
        const lessonType = await prisma.$queryRaw<any[]>`
          SELECT * FROM lesson_types WHERE id = ${id as string}
        `;
        if (lessonType.length === 0 || lessonType[0].teacherId !== userId) {
          return res.status(404).json({ error: 'Lesson type not found' });
        }
        return res.json(lessonType[0]);
      } else {
        console.log('Getting lesson types for userId:', userId);
        const lessonTypes = await prisma.$queryRaw<any[]>`
          SELECT * FROM lesson_types
          WHERE "teacherId" = ${userId}
          ORDER BY "createdAt" ASC
        `;
        console.log('Found lesson types:', lessonTypes.length);
        return res.json(lessonTypes);
      }
    }

  if (req.method === 'POST') {
    const { name, color, pricePerHour } = req.body;
    if (!name || !color || pricePerHour === undefined) {
      return res.status(400).json({ error: 'Name, color, and pricePerHour are required' });
    }

    const lessonTypeId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO lesson_types (id, name, color, "pricePerHour", "teacherId", "createdAt", "updatedAt")
      VALUES (${lessonTypeId}, ${name}, ${color}, ${parseFloat(pricePerHour)}, ${userId}, NOW(), NOW())
    `;

    const lessonType = await prisma.$queryRaw<any[]>`
      SELECT * FROM lesson_types WHERE id = ${lessonTypeId}
    `;

    return res.status(201).json(lessonType[0]);
  }

  if (req.method === 'PUT') {
    if (!id) {
      return res.status(400).json({ error: 'Lesson type ID required' });
    }

    const { name, color, pricePerHour } = req.body;

    // Check ownership
    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM lesson_types WHERE id = ${id as string}
    `;
    if (existing.length === 0 || existing[0].teacherId !== userId) {
      return res.status(404).json({ error: 'Lesson type not found' });
    }

    await prisma.$executeRaw`
      UPDATE lesson_types
      SET
        name = COALESCE(${name}, name),
        color = COALESCE(${color}, color),
        "pricePerHour" = COALESCE(${pricePerHour ? parseFloat(pricePerHour) : null}, "pricePerHour"),
        "updatedAt" = NOW()
      WHERE id = ${id as string}
    `;

    const lessonType = await prisma.$queryRaw<any[]>`
      SELECT * FROM lesson_types WHERE id = ${id as string}
    `;

    return res.json(lessonType[0]);
  }

  if (req.method === 'DELETE') {
    if (!id) {
      return res.status(400).json({ error: 'Lesson type ID required' });
    }

    // Check ownership
    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM lesson_types WHERE id = ${id as string}
    `;
    if (existing.length === 0 || existing[0].teacherId !== userId) {
      return res.status(404).json({ error: 'Lesson type not found' });
    }

    await prisma.$executeRaw`
      DELETE FROM lesson_types WHERE id = ${id as string}
    `;

    return res.status(204).end();
  }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in handleLessonTypes:', error);
    throw error;
  }
}

// Handler for Personal Schedule (CRUD) - using raw SQL
async function handleSchedule(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const { id } = req.query;

    if (req.method === 'GET') {
    if (id) {
      const slot = await prisma.$queryRaw<any[]>`
        SELECT
          s.*,
          json_build_object(
            'id', lt.id,
            'name', lt.name,
            'color', lt.color,
            'pricePerHour', lt."pricePerHour"
          ) as "lessonType"
        FROM personal_schedule_slots s
        LEFT JOIN lesson_types lt ON s."lessonTypeId" = lt.id
        WHERE s.id = ${id as string}
      `;
      if (slot.length === 0 || slot[0].teacherId !== userId) {
        return res.status(404).json({ error: 'Schedule slot not found' });
      }
      return res.json(slot[0]);
    } else {
      const slots = await prisma.$queryRaw<any[]>`
        SELECT
          s.*,
          json_build_object(
            'id', lt.id,
            'name', lt.name,
            'color', lt.color,
            'pricePerHour', lt."pricePerHour"
          ) as "lessonType"
        FROM personal_schedule_slots s
        LEFT JOIN lesson_types lt ON s."lessonTypeId" = lt.id
        WHERE s."teacherId" = ${userId}
        ORDER BY s."dayOfWeek" ASC, s.time ASC
      `;
      return res.json(slots);
    }
  }

  if (req.method === 'POST') {
    const { dayOfWeek, time, lessonTypeId, studentName } = req.body;
    if (dayOfWeek === undefined || !time || !lessonTypeId) {
      return res.status(400).json({ error: 'dayOfWeek, time, and lessonTypeId are required' });
    }

    const slotId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO personal_schedule_slots (id, "dayOfWeek", time, "studentName", "teacherId", "lessonTypeId", "createdAt", "updatedAt")
      VALUES (${slotId}, ${parseInt(dayOfWeek)}, ${time}, ${studentName || null}, ${userId}, ${lessonTypeId}, NOW(), NOW())
    `;

    const slot = await prisma.$queryRaw<any[]>`
      SELECT
        s.*,
        json_build_object(
          'id', lt.id,
          'name', lt.name,
          'color', lt.color,
          'pricePerHour', lt."pricePerHour"
        ) as "lessonType"
      FROM personal_schedule_slots s
      LEFT JOIN lesson_types lt ON s."lessonTypeId" = lt.id
      WHERE s.id = ${slotId}
    `;

    return res.status(201).json(slot[0]);
  }

  if (req.method === 'PUT') {
    if (!id) {
      return res.status(400).json({ error: 'Schedule slot ID required' });
    }

    const { dayOfWeek, time, lessonTypeId, studentName } = req.body;

    // Check ownership
    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM personal_schedule_slots WHERE id = ${id as string}
    `;
    if (existing.length === 0 || existing[0].teacherId !== userId) {
      return res.status(404).json({ error: 'Schedule slot not found' });
    }

    await prisma.$executeRaw`
      UPDATE personal_schedule_slots
      SET
        "dayOfWeek" = COALESCE(${dayOfWeek !== undefined ? parseInt(dayOfWeek) : null}, "dayOfWeek"),
        time = COALESCE(${time}, time),
        "lessonTypeId" = COALESCE(${lessonTypeId}, "lessonTypeId"),
        "studentName" = ${studentName !== undefined ? studentName : existing[0].studentName},
        "updatedAt" = NOW()
      WHERE id = ${id as string}
    `;

    const slot = await prisma.$queryRaw<any[]>`
      SELECT
        s.*,
        json_build_object(
          'id', lt.id,
          'name', lt.name,
          'color', lt.color,
          'pricePerHour', lt."pricePerHour"
        ) as "lessonType"
      FROM personal_schedule_slots s
      LEFT JOIN lesson_types lt ON s."lessonTypeId" = lt.id
      WHERE s.id = ${id as string}
    `;

    return res.json(slot[0]);
  }

  if (req.method === 'DELETE') {
    if (!id) {
      return res.status(400).json({ error: 'Schedule slot ID required' });
    }

    // Check ownership
    const existing = await prisma.$queryRaw<any[]>`
      SELECT * FROM personal_schedule_slots WHERE id = ${id as string}
    `;
    if (existing.length === 0 || existing[0].teacherId !== userId) {
      return res.status(404).json({ error: 'Schedule slot not found' });
    }

    await prisma.$executeRaw`
      DELETE FROM personal_schedule_slots WHERE id = ${id as string}
    `;

    return res.status(204).end();
  }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in handleSchedule:', error);
    throw error;
  }
}

// Helper function to calculate period end date
function getPeriodEndDate(periodStart: string): string {
  const [year, month, day] = periodStart.split('-').map(Number);
  const startDate = new Date(year, month - 1, day);

  // Check if this is a period start (day 1 or 16) or a regular week start
  // Period requests ALWAYS use day 1 or 16
  if (day === 1) {
    // First half of month: 1-15
    return `${year}-${String(month).padStart(2, '0')}-15`;
  } else if (day === 16) {
    // Second half of month: 16-end of month
    const lastDay = new Date(year, month, 0).getDate(); // Last day of month
    return `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  } else {
    // Regular week: add 6 days to get end of week
    startDate.setDate(startDate.getDate() + 6);
    const endYear = startDate.getFullYear();
    const endMonth = String(startDate.getMonth() + 1).padStart(2, '0');
    const endDay = String(startDate.getDate()).padStart(2, '0');
    return `${endYear}-${endMonth}-${endDay}`;
  }
}

// Handler for Completed Lessons - using raw SQL
async function handleCompleted(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    const { scheduleSlotId, weekStart } = req.query;

    if (req.method === 'GET') {
      if (!weekStart) {
        return res.status(400).json({ error: 'weekStart is required' });
      }

      // Calculate period end date for filtering
      const periodEnd = getPeriodEndDate(weekStart as string);

      const slots = await prisma.$queryRaw<any[]>`
        SELECT
          s.*,
          json_build_object(
            'id', lt.id,
            'name', lt.name,
            'color', lt.color,
            'pricePerHour', lt."pricePerHour"
          ) as "lessonType",
          COALESCE(
            json_agg(
              json_build_object(
                'id', cl.id,
                'weekStart', cl."weekStart",
                'completed', cl.completed,
                'paid', cl.paid
              )
            ) FILTER (WHERE cl.id IS NOT NULL AND cl."weekStart" >= ${weekStart as string} AND cl."weekStart" <= ${periodEnd}),
            '[]'::json
          ) as "completedLessons"
        FROM personal_schedule_slots s
        LEFT JOIN lesson_types lt ON s."lessonTypeId" = lt.id
        LEFT JOIN completed_lessons cl ON s.id = cl."scheduleSlotId"
        WHERE s."teacherId" = ${userId}
        GROUP BY s.id, lt.id
        ORDER BY s."dayOfWeek" ASC, s.time ASC
      `;

      return res.json(slots);
    }

    if (req.method === 'POST' || req.method === 'PUT') {
      const { scheduleSlotId: bodySlotId, weekStart: bodyWeekStart, completed, paid } = req.body;
      const slotId = scheduleSlotId || bodySlotId;
      const week = weekStart || bodyWeekStart;

      if (!slotId || !week) {
        return res.status(400).json({ error: 'scheduleSlotId and weekStart are required' });
      }

      // Verify ownership
      const slot = await prisma.$queryRaw<any[]>`
        SELECT * FROM personal_schedule_slots WHERE id = ${slotId as string}
      `;
      if (slot.length === 0 || slot[0].teacherId !== userId) {
        return res.status(404).json({ error: 'Schedule slot not found' });
      }

      // Check if completed lesson exists
      const existing = await prisma.$queryRaw<any[]>`
        SELECT * FROM completed_lessons
        WHERE "scheduleSlotId" = ${slotId as string} AND "weekStart" = ${week as string}
      `;

      if (existing.length > 0) {
        // Update
        await prisma.$executeRaw`
          UPDATE completed_lessons
          SET
            completed = COALESCE(${completed !== undefined ? completed : null}, completed),
            paid = COALESCE(${paid !== undefined ? paid : null}, paid),
            "updatedAt" = NOW()
          WHERE "scheduleSlotId" = ${slotId as string} AND "weekStart" = ${week as string}
        `;
      } else {
        // Insert
        const lessonId = crypto.randomUUID();
        await prisma.$executeRaw`
          INSERT INTO completed_lessons (id, "scheduleSlotId", "weekStart", completed, paid, "createdAt", "updatedAt")
          VALUES (
            ${lessonId},
            ${slotId as string},
            ${week as string},
            ${completed !== undefined ? completed : false},
            ${paid !== undefined ? paid : false},
            NOW(),
            NOW()
          )
        `;
      }

      const completedLesson = await prisma.$queryRaw<any[]>`
        SELECT * FROM completed_lessons
        WHERE "scheduleSlotId" = ${slotId as string} AND "weekStart" = ${week as string}
      `;

      return res.json(completedLesson[0]);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in handleCompleted:', error);
    throw error;
  }
}

// Handler for calculating week/period earnings - using raw SQL
async function handleWeekEarnings(req: VercelRequest, res: VercelResponse, userId: string) {
  try {
    if (req.method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { weekStart } = req.query;
    if (!weekStart) {
      return res.status(400).json({ error: 'weekStart is required' });
    }

    // Calculate period end date for filtering
    const periodEnd = getPeriodEndDate(weekStart as string);

    // For periods (1-15 or 16-end), we need to sum across all weeks in the period
    // For regular weeks, we only count the specific week
    const [year, month, day] = (weekStart as string).split('-').map(Number);

    // Check if this is a period request or a week request
    // Period requests ALWAYS use day 1 or 16
    const isPeriod = (day === 1 || day === 16);

    console.log(`[handleWeekEarnings] ===== EARNINGS CALCULATION =====`);
    console.log(`  weekStart: ${weekStart}`);
    console.log(`  day of month: ${day}`);
    console.log(`  isPeriod: ${isPeriod} (day 1 or 16 = period, other days = week)`);
    console.log(`  periodEnd: ${periodEnd}`);
    console.log(`[handleWeekEarnings] ==============================`);

    let earningsQuery;
    if (isPeriod) {
      // Period calculation: sum all weeks in the period
      // Only count lessons that were actually completed in this period
      earningsQuery = prisma.$queryRaw<any[]>`
        SELECT
          COUNT(DISTINCT cl.id) FILTER (WHERE cl.completed = true) as "completedCount",
          COUNT(DISTINCT cl.id) FILTER (WHERE cl.paid = true) as "paidCount",
          COALESCE(SUM(CASE WHEN cl.paid = true THEN lt."pricePerHour" ELSE 0 END), 0) as "totalEarnings",
          COUNT(DISTINCT s.id) as "totalSlots"
        FROM completed_lessons cl
        INNER JOIN personal_schedule_slots s ON cl."scheduleSlotId" = s.id
        INNER JOIN lesson_types lt ON s."lessonTypeId" = lt.id
        WHERE s."teacherId" = ${userId}
          AND cl."weekStart" >= ${weekStart as string}
          AND cl."weekStart" <= ${periodEnd}
      `;
    } else {
      // Week calculation: count only lessons with exact weekStart
      earningsQuery = prisma.$queryRaw<any[]>`
        SELECT
          COUNT(DISTINCT cl.id) FILTER (WHERE cl.completed = true) as "completedCount",
          COUNT(DISTINCT cl.id) FILTER (WHERE cl.paid = true) as "paidCount",
          COALESCE(SUM(CASE WHEN cl.paid = true THEN lt."pricePerHour" ELSE 0 END), 0) as "totalEarnings",
          COUNT(DISTINCT s.id) as "totalSlots"
        FROM completed_lessons cl
        INNER JOIN personal_schedule_slots s ON cl."scheduleSlotId" = s.id
        INNER JOIN lesson_types lt ON s."lessonTypeId" = lt.id
        WHERE s."teacherId" = ${userId}
          AND cl."weekStart" = ${weekStart as string}
      `;
    }

    const result = await earningsQuery;

    return res.json({
      weekStart,
      totalEarnings: parseFloat(result[0].totalEarnings || '0'),
      completedCount: parseInt(result[0].completedCount || '0'),
      paidCount: parseInt(result[0].paidCount || '0'),
      totalSlots: parseInt(result[0].totalSlots || '0')
    });
  } catch (error) {
    console.error('Error in handleWeekEarnings:', error);
    throw error;
  }
}
