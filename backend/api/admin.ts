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
    const { action } = req.query;

    // Handle /admin/create-admin endpoint (create first admin with secret)
    if (action === 'create-admin') {
      return await handleCreateFirstAdmin(req, res);
    }

    // Handle /admin/users endpoint (authenticated admin operations)
    return await handleUsers(req, res);

  } catch (error) {
    console.error('Error in admin handler:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  } finally {
    await prisma.$disconnect();
  }
}

// Handler for creating first admin with secret key
async function handleCreateFirstAdmin(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, fullName, adminSecret } = req.body;

  // Secret key для создания первого админа
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

  // Create admin user
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
}

// Handler for authenticated user management
async function handleUsers(req: VercelRequest, res: VercelResponse) {
  // Verify JWT and check admin role
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');
  const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

  // Check if user is admin and get their school
  const currentUser = await prisma.$queryRaw<any[]>`
    SELECT role, school FROM users WHERE id = ${decoded.userId}
  `;

  if (!currentUser[0] || currentUser[0].role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied. Admin role required.' });
  }

  const adminSchool = currentUser[0].school; // null for super admin, school name for school admin

  // GET - List all users
  if (req.method === 'GET') {
    let users;

    if (adminSchool === null) {
      // Super admin - see all users
      users = await prisma.$queryRaw<any[]>`
        SELECT id, email, "fullName", role, school, "createdAt", "updatedAt"
        FROM users
        ORDER BY "createdAt" DESC
      `;
    } else {
      // School admin - see only users from their school
      users = await prisma.$queryRaw<any[]>`
        SELECT id, email, "fullName", role, school, "createdAt", "updatedAt"
        FROM users
        WHERE school = ${adminSchool}
        ORDER BY "createdAt" DESC
      `;
    }

    return res.status(200).json(users);
  }

  // POST - Create new user (teacher or admin)
  if (req.method === 'POST') {
    const { email, password, fullName, role, school } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'Email, password, and fullName are required' });
    }

    const userRole = role === 'ADMIN' ? 'ADMIN' : 'TEACHER';

    // Determine school for new user
    let schoolValue: string | null;
    if (adminSchool !== null) {
      // School admin can only create users for their school
      schoolValue = adminSchool;
    } else {
      // Super admin can specify any school
      schoolValue = school || null;
    }

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
      INSERT INTO users (id, email, password, "fullName", role, school, "createdAt", "updatedAt")
      VALUES (${userId}, ${email}, ${hashedPassword}, ${fullName}, ${userRole}::"Role", ${schoolValue}, NOW(), NOW())
    `;

    const newUser = await prisma.$queryRaw<any[]>`
      SELECT id, email, "fullName", role, school FROM users WHERE id = ${userId}
    `;

    return res.status(201).json({
      message: 'User created successfully',
      user: newUser[0]
    });
  }

  // PUT - Update user
  if (req.method === 'PUT') {
    const { id } = req.query;
    const { email, password, fullName, role, school } = req.body;

    if (!id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Check if school admin is trying to edit user from their school
    if (adminSchool !== null) {
      const targetUser = await prisma.user.findUnique({
        where: { id: id as string },
        select: { school: true }
      });

      if (!targetUser || targetUser.school !== adminSchool) {
        return res.status(403).json({ error: 'You can only edit users from your school' });
      }
    }

    // Use Prisma for simpler update
    const updateData: any = {};

    if (email) updateData.email = email;
    if (fullName) updateData.fullName = fullName;
    if (role) updateData.role = role === 'ADMIN' ? 'ADMIN' : 'TEACHER';

    // School admin cannot change school, only super admin can
    if (school !== undefined && adminSchool === null) {
      updateData.school = school || null;
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: id as string },
      data: updateData,
      select: { id: true, email: true, fullName: true, role: true, school: true }
    });

    return res.status(200).json({
      message: 'User updated successfully',
      user: updatedUser
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

    // Check if school admin is trying to delete user from their school
    if (adminSchool !== null) {
      const targetUser = await prisma.user.findUnique({
        where: { id: id as string },
        select: { school: true }
      });

      if (!targetUser || targetUser.school !== adminSchool) {
        return res.status(403).json({ error: 'You can only delete users from your school' });
      }
    }

    await prisma.$executeRaw`
      DELETE FROM users WHERE id = ${id as string}
    `;

    return res.status(200).json({ message: 'User deleted successfully' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
