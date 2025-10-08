import express from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = express.Router();
const prisma = new PrismaClient();

router.use(authenticateToken);

// Get all groups for the authenticated teacher
router.get('/', async (req: AuthRequest, res) => {
  try {
    const groups = await prisma.group.findMany({
      where: {
        teacherId: req.user!.userId
      },
      include: {
        _count: {
          select: { students: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    res.json(groups);
  } catch (error) {
    console.error('Error fetching groups:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific group
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    
    const group = await prisma.group.findFirst({
      where: {
        id,
        teacherId: req.user!.userId
      },
      include: {
        students: true
      }
    });

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    console.error('Error fetching group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create a new group
router.post('/', async (req: AuthRequest, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Check if group with this name already exists for this teacher
    const existingGroup = await prisma.group.findFirst({
      where: {
        name,
        teacherId: req.user!.userId
      }
    });

    if (existingGroup) {
      return res.status(409).json({ error: 'Group with this name already exists' });
    }

    const group = await prisma.group.create({
      data: {
        name,
        description: description || null,
        teacherId: req.user!.userId
      },
      include: {
        _count: {
          select: { students: true }
        }
      }
    });

    res.status(201).json(group);
  } catch (error) {
    console.error('Error creating group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update a group
router.put('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const existingGroup = await prisma.group.findFirst({
      where: {
        id,
        teacherId: req.user!.userId
      }
    });

    if (!existingGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // If name is being changed, check for duplicates
    if (name && name !== existingGroup.name) {
      const nameExists = await prisma.group.findFirst({
        where: {
          name,
          teacherId: req.user!.userId,
          id: { not: id }
        }
      });

      if (nameExists) {
        return res.status(409).json({ error: 'Group with this name already exists' });
      }
    }

    const group = await prisma.group.update({
      where: { id },
      data: {
        name: name || existingGroup.name,
        description: description !== undefined ? description : existingGroup.description
      },
      include: {
        _count: {
          select: { students: true }
        }
      }
    });

    res.json(group);
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a group
router.delete('/:id', async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    const existingGroup = await prisma.group.findFirst({
      where: {
        id,
        teacherId: req.user!.userId
      }
    });

    if (!existingGroup) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Check if group has students
    const studentCount = await prisma.student.count({
      where: { groupId: id }
    });

    if (studentCount > 0) {
      return res.status(400).json({ 
        error: `Cannot delete group with ${studentCount} students. Move students to another group first.` 
      });
    }

    await prisma.group.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;