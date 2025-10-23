import { VercelRequest, VercelResponse } from '@vercel/node';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

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
    if (req.method === 'GET') {
      // Get attendance records with filters
      const { studentId, groupId, dateFrom, dateTo } = req.query;

      let whereClause = `WHERE "teacherId" = '${userId}'`;

      if (studentId) {
        whereClause += ` AND "studentId" = '${studentId}'`;
      }

      if (groupId) {
        whereClause += ` AND "groupId" = '${groupId}'`;
      }

      if (dateFrom) {
        whereClause += ` AND date >= '${dateFrom}'`;
      }

      if (dateTo) {
        whereClause += ` AND date <= '${dateTo}'`;
      }

      const attendance = await prisma.$queryRaw`
        SELECT
          id,
          "studentId",
          date,
          status,
          "teacherId",
          "groupId",
          "createdAt",
          "updatedAt"
        FROM attendance
        ${prisma.$queryRawUnsafe(whereClause)}
        ORDER BY date DESC
      `;

      return res.status(200).json(attendance);
    }

    if (req.method === 'POST') {
      // Create or update attendance record
      const { studentId, date, status, groupId } = req.body;

      if (!studentId || !date || !status) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if record exists
      const existing = await prisma.$queryRaw`
        SELECT id FROM attendance
        WHERE "studentId" = ${studentId} AND date = ${date}
      ` as any[];

      if (existing.length > 0) {
        // Update existing record
        await prisma.$executeRaw`
          UPDATE attendance
          SET status = ${status},
              "groupId" = ${groupId || null},
              "teacherId" = ${userId},
              "updatedAt" = NOW()
          WHERE "studentId" = ${studentId} AND date = ${date}
        `;

        const updated = await prisma.$queryRaw`
          SELECT
            id,
            "studentId",
            date,
            status,
            "teacherId",
            "groupId",
            "createdAt",
            "updatedAt"
          FROM attendance
          WHERE "studentId" = ${studentId} AND date = ${date}
        ` as any[];

        return res.status(200).json(updated[0]);
      } else {
        // Create new record - generate UUID
        const id = Math.random().toString(36).substr(2, 9);

        await prisma.$executeRaw`
          INSERT INTO attendance (id, "studentId", date, status, "teacherId", "groupId", "createdAt", "updatedAt")
          VALUES (${id}, ${studentId}, ${date}, ${status}, ${userId}, ${groupId || null}, NOW(), NOW())
        `;

        const created = await prisma.$queryRaw`
          SELECT
            id,
            "studentId",
            date,
            status,
            "teacherId",
            "groupId",
            "createdAt",
            "updatedAt"
          FROM attendance
          WHERE id = ${id}
        ` as any[];

        return res.status(201).json(created[0]);
      }
    }

    if (req.method === 'DELETE') {
      const { studentId, date } = req.query;

      if (!studentId || !date) {
        return res.status(400).json({ error: 'Missing studentId or date' });
      }

      await prisma.$executeRaw`
        DELETE FROM attendance
        WHERE "studentId" = ${studentId} AND date = ${date} AND "teacherId" = ${userId}
      `;

      return res.status(200).json({ message: 'Attendance record deleted' });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Attendance API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
