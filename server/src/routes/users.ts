import { Router, Response } from 'express';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { User } from '../models/User';
import { Customer } from '../models/Customer';
import { Deal } from '../models/Deal';
import { Task } from '../models/Task';
import { Notification } from '../models/Notification';
import { requireAuth, requireAdmin, AuthenticatedRequest } from '../middleware/auth';
import { validateBody, validateParams, objectIdSchema } from '../middleware/validate';

const router = Router();

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'staff']),
});

const updateUserSchema = z.object({
  name: z.string().min(2).trim().optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  role: z.enum(['admin', 'staff']).optional(),
  isActive: z.boolean().optional(),
  password: z.string().min(6).optional(),
});

const paramIdSchema = z.object({
  id: objectIdSchema,
});

// GET /api/users
// Admin gets full details; Staff gets public active member list for dropdown assignment
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role === 'admin') {
      const users = await User.find().sort({ createdAt: -1 });
      res.json({ users });
      return;
    }

    // Staff only gets active team members for assignment
    const users = await User.find({ isActive: true }).select('name email role');
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users (Admin only)
router.post(
  '/',
  requireAuth,
  requireAdmin,
  validateBody(createUserSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, email, password, role } = req.body;

      const existing = await User.findOne({ email });
      if (existing) {
        res.status(409).json({ error: 'A user with this email already exists.' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await User.create({
        name,
        email,
        passwordHash,
        role,
        isActive: true,
      });

      res.status(201).json({
        message: 'User created successfully',
        user: newUser,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
);

// PATCH /api/users/:id (Admin only)
router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(paramIdSchema),
  validateBody(updateUserSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, email, role, isActive, password } = req.body;

      const user = await User.findById(id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Prevent self-deactivation or demotion of current admin
      if (user._id.toString() === req.user!._id.toString()) {
        if (isActive === false) {
          res.status(400).json({ error: 'You cannot deactivate your own account.' });
          return;
        }
        if (role && role !== 'admin') {
          res.status(400).json({ error: 'You cannot remove your own admin role.' });
          return;
        }
      }

      if (email && email !== user.email) {
        const existing = await User.findOne({ email });
        if (existing) {
          res.status(409).json({ error: 'Another user with this email already exists.' });
          return;
        }
        user.email = email;
      }

      if (name) user.name = name;
      if (role) user.role = role;
      if (typeof isActive === 'boolean') user.isActive = isActive;
      if (password) {
        user.passwordHash = await bcrypt.hash(password, 10);
      }

      await user.save();
      res.json({ message: 'User updated successfully', user });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
);

// DELETE /api/users/:id (Admin only)
router.delete(
  '/:id',
  requireAuth,
  requireAdmin,
  validateParams(paramIdSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const user = await User.findById(id);
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // 1. Prevent self-deletion
      if (user._id.toString() === req.user!._id.toString()) {
        res.status(400).json({ error: 'You cannot delete your own administrative account.' });
        return;
      }

      // 2. Prevent deleting the last administrator
      if (user.role === 'admin') {
        const adminCount = await User.countDocuments({ role: 'admin' });
        if (adminCount <= 1) {
          res.status(400).json({ error: 'Cannot delete the sole administrator account.' });
          return;
        }
      }

      // 3. Reassign customers and deals to the executing admin so data is never orphaned
      await Customer.updateMany({ ownerId: user._id }, { ownerId: req.user!._id });
      await Deal.updateMany({ ownerId: user._id }, { ownerId: req.user!._id });

      // 4. Reassign open tasks to the executing admin
      await Task.updateMany({ assignedTo: user._id }, { assignedTo: req.user!._id });

      // 5. Clean up notifications for the deleted user
      await Notification.deleteMany({ userId: user._id });

      // 6. Delete the user
      await User.findByIdAndDelete(id);

      res.json({
        message: `Team member ${user.name} was successfully deleted. Any associated records have been reassigned to you.`,
        deletedUserId: id,
      });
    } catch (error) {
      console.error('Error deleting user:', error);
      res.status(500).json({ error: 'Failed to delete team member' });
    }
  }
);

export default router;
