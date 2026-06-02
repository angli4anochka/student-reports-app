import express from 'express';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, requireRole, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();
const ADMIN_SECRET = process.env.ADMIN_SECRET || '';

// Create first admin
router.post('/create-admin', async (req, res) => {
  try {
    const { email, password, fullName, secret } = req.body;

    if (!email || !password || !fullName || !secret) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (secret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Invalid admin secret' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        role: 'ADMIN'
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true
      }
    });

    return res.status(201).json(admin);
  } catch (error) {
    console.error('Error creating admin:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all users (admin only - filtered by organization)
router.get('/users', authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    // Get admin's organization
    const admin = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      select: { organizationId: true }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    // Filter users by organization
    let whereCondition: any = {};
    if (admin.organizationId) {
      // Admin with organization - show only users from same organization
      whereCondition.organizationId = admin.organizationId;
    }
    // If admin has no organization (super admin), show all users

    const users = await prisma.user.findMany({
      where: whereCondition,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        createdAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.status(200).json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create user (admin only)
router.post('/users', authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { email, password, fullName, role } = req.body;

    if (!email || !password || !fullName || !role) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Get admin's organization
    const admin = await prisma.user.findUnique({
      where: { id: req.user?.userId },
      select: { organizationId: true }
    });

    if (!admin) {
      return res.status(404).json({ error: 'Admin not found' });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        role: role as 'TEACHER' | 'ADMIN',
        organizationId: admin.organizationId // Set same organization as admin
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true
      }
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update user (admin only)
router.put('/users/:id', authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { email, fullName, role, password } = req.body;

    const updateData: any = {};
    if (email) updateData.email = email;
    if (fullName) updateData.fullName = fullName;
    if (role) updateData.role = role;
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true
      }
    });

    return res.status(200).json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete user (admin only)
router.delete('/users/:id', authenticateToken, requireRole('ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
      where: { id }
    });

    return res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
