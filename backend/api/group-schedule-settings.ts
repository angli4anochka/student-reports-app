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
      const { groupId } = req.query;

      if (!groupId) {
        return res.status(400).json({ error: 'groupId is required' });
      }

      // Get schedule settings for group
      const settings = await prisma.$queryRaw`
        SELECT
          id,
          "groupId",
          weekdays,
          "createdAt",
          "updatedAt"
        FROM group_schedule_settings
        WHERE "groupId" = ${groupId}
      ` as any[];

      if (settings.length === 0) {
        // Return default: Tuesday and Thursday
        return res.status(200).json({ groupId, weekdays: '2,4' });
      }

      return res.status(200).json(settings[0]);
    }

    if (req.method === 'POST') {
      const { groupId, weekdays } = req.body;

      if (!groupId || weekdays === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      // Check if settings exist
      const existing = await prisma.$queryRaw`
        SELECT id FROM group_schedule_settings
        WHERE "groupId" = ${groupId}
      ` as any[];

      if (existing.length > 0) {
        // Update existing
        await prisma.$executeRaw`
          UPDATE group_schedule_settings
          SET weekdays = ${weekdays},
              "updatedAt" = NOW()
          WHERE "groupId" = ${groupId}
        `;

        const updated = await prisma.$queryRaw`
          SELECT
            id,
            "groupId",
            weekdays,
            "createdAt",
            "updatedAt"
          FROM group_schedule_settings
          WHERE "groupId" = ${groupId}
        ` as any[];

        return res.status(200).json(updated[0]);
      } else {
        // Create new
        const id = Math.random().toString(36).substr(2, 9);

        await prisma.$executeRaw`
          INSERT INTO group_schedule_settings (id, "groupId", weekdays, "createdAt", "updatedAt")
          VALUES (${id}, ${groupId}, ${weekdays}, NOW(), NOW())
        `;

        const created = await prisma.$queryRaw`
          SELECT
            id,
            "groupId",
            weekdays,
            "createdAt",
            "updatedAt"
          FROM group_schedule_settings
          WHERE id = ${id}
        ` as any[];

        return res.status(201).json(created[0]);
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Group schedule settings API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
