import { VercelRequest, VercelResponse } from '@vercel/node';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Verify JWT and check admin role
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

    // Check if user is admin
    const currentUser = await prisma.$queryRaw<any[]>`
      SELECT role FROM users WHERE id = ${decoded.userId}
    `;

    if (!currentUser[0] || currentUser[0].role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied. Admin role required.' });
    }

    // GET - List all users
    if (req.method === 'GET') {
      const users = await prisma.$queryRaw<any[]>`
        SELECT id, email, "fullName", role, "createdAt", "updatedAt"
        FROM users
        ORDER BY "createdAt" DESC
      `;

      return res.status(200).json(users);
    }

    // POST - Create new user (teacher or admin)
    if (req.method === 'POST') {
      const { email, password, fullName, role } = req.body;

      if (!email || !password || !fullName) {
        return res.status(400).json({ error: 'Email, password, and fullName are required' });
      }

      const userRole = role === 'ADMIN' ? 'ADMIN' : 'TEACHER';

      // Check if user exists
      const existingUser = await prisma.$queryRaw<any[]>`
        SELECT * FROM users WHERE email = ${email}
      `;

      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'User with this email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const userId = crypto.randomUUID();
      await prisma.$executeRaw`
        INSERT INTO users (id, email, password, "fullName", role, "createdAt", "updatedAt")
        VALUES (${userId}, ${email}, ${hashedPassword}, ${fullName}, ${userRole}::"Role", NOW(), NOW())
      `;

      const newUser = await prisma.$queryRaw<any[]>`
        SELECT id, email, "fullName", role FROM users WHERE id = ${userId}
      `;

      return res.status(201).json({
        message: 'User created successfully',
        user: newUser[0]
      });
    }

    // PUT - Update user
    if (req.method === 'PUT') {
      const { id } = req.query;
      const { email, password, fullName, role } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const updateFields: string[] = [];
      const values: any[] = [];

      if (email) {
        updateFields.push(`email = $${updateFields.length + 1}`);
        values.push(email);
      }

      if (fullName) {
        updateFields.push(`"fullName" = $${updateFields.length + 1}`);
        values.push(fullName);
      }

      if (role) {
        const userRole = role === 'ADMIN' ? 'ADMIN' : 'TEACHER';
        updateFields.push(`role = $${updateFields.length + 1}::"Role"`);
        values.push(userRole);
      }

      if (password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        updateFields.push(`password = $${updateFields.length + 1}`);
        values.push(hashedPassword);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateFields.push(`"updatedAt" = NOW()`);

      await prisma.$executeRaw`
        UPDATE users
        SET ${updateFields.join(', ')}
        WHERE id = ${id as string}
      `;

      const updatedUser = await prisma.$queryRaw<any[]>`
        SELECT id, email, "fullName", role FROM users WHERE id = ${id as string}
      `;

      return res.status(200).json({
        message: 'User updated successfully',
        user: updatedUser[0]
      });
    }

    // DELETE - Delete user
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      // Don't allow admin to delete themselves
      if (id === decoded.userId) {
        return res.status(400).json({ error: 'Cannot delete your own account' });
      }

      await prisma.$executeRaw`
        DELETE FROM users WHERE id = ${id as string}
      `;

      return res.status(200).json({ message: 'User deleted successfully' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Error in admin users handler:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}
