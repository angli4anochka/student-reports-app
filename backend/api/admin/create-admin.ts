import { VercelRequest, VercelResponse } from '@vercel/node';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, password, fullName, adminSecret } = req.body;

    // Secret key для создания первого админа
    // В production это должно быть в environment variables
    const ADMIN_SECRET = process.env.ADMIN_SECRET || 'create-first-admin-2025';

    if (adminSecret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Invalid admin secret' });
    }

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and fullName are required' });
    }

    // Check if admin already exists
    const existingAdmin = await prisma.$queryRaw<any[]>`
      SELECT * FROM users WHERE email = ${email}
    `;

    if (existingAdmin.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create admin user with raw SQL
    const userId = crypto.randomUUID();
    await prisma.$executeRaw`
      INSERT INTO users (id, email, password, "fullName", role, "createdAt", "updatedAt")
      VALUES (${userId}, ${email}, ${hashedPassword}, ${fullName}, 'ADMIN', NOW(), NOW())
    `;

    const newAdmin = await prisma.$queryRaw<any[]>`
      SELECT id, email, "fullName", role FROM users WHERE id = ${userId}
    `;

    return res.status(201).json({
      message: 'Admin created successfully',
      admin: newAdmin[0]
    });

  } catch (error) {
    console.error('Error creating admin:', error);
    return res.status(500).json({
      error: 'Failed to create admin',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}
