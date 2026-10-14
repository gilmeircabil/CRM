import { Router, Response } from 'express';
import { z } from 'zod';
import { Task, TaskPriority } from '../models/Task';
import { Customer } from '../models/Customer';
import { Deal } from '../models/Deal';
import { Activity } from '../models/Activity';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateBody, validateParams, validateQuery, objectIdSchema } from '../middleware/validate';

const router = Router();

const priorities: [TaskPriority, ...TaskPriority[]] = ['low', 'medium', 'high'];

const createTaskSchema = z.object({
  description: z.string().min(1, 'Description is required').trim(),
  priority: z.enum(priorities).default('medium'),
  dueDate: z.string().transform((v) => new Date(v)),
  assignedTo: objectIdSchema.optional(),
  customerId: objectIdSchema.optional(),
  dealId: objectIdSchema.optional(),
});

const updateTaskSchema = z.object({
  description: z.string().min(1).trim().optional(),
  priority: z.enum(priorities).optional(),
  dueDate: z.string().transform((v) => new Date(v)).optional(),
  assignedTo: objectIdSchema.optional(),
  customerId: objectIdSchema.optional(),
  dealId: objectIdSchema.optional(),
  isCompleted: z.boolean().optional(),
});

const taskQuerySchema = z.object({
  filter: z
    .enum(['all', 'mine', 'overdue', 'due_today', 'completed', 'open'])
    .optional()
    .default('all'),
  customerId: objectIdSchema.optional(),
  dealId: objectIdSchema.optional(),
  priority: z.enum(priorities).optional(),
});

const paramIdSchema = z.object({
  id: objectIdSchema,
});

// GET /api/tasks - List tasks with filters and role scoping
router.get(
  '/',
  requireAuth,
  validateQuery(taskQuerySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { filter, customerId, dealId, priority } = req.query as any;
      const query: any = {};

      // Role scoping: Staff can only see tasks assigned to them
      if (req.user!.role === 'staff' || filter === 'mine') {
        query.assignedTo = req.user!._id;
      }

      if (customerId) query.customerId = customerId;
      if (dealId) query.dealId = dealId;
      if (priority) query.priority = priority;

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      if (filter === 'overdue') {
        query.isCompleted = false;
        query.dueDate = { $lt: now };
      } else if (filter === 'due_today') {
        query.isCompleted = false;
        query.dueDate = { $gte: startOfDay, $lte: endOfDay };
      } else if (filter === 'completed') {
        query.isCompleted = true;
      } else if (filter === 'open') {
        query.isCompleted = false;
      }

      const tasks = await Task.find(query)
        .populate('assignedTo', 'name email')
        .populate('customerId', 'name company')
        .populate('dealId', 'title value')
        .populate('createdBy', 'name email')
        .sort({ isCompleted: 1, dueDate: 1 });

      res.json({ tasks });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  }
);

// POST /api/tasks - Create task
router.post(
  '/',
  requireAuth,
  validateBody(createTaskSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { description, priority, dueDate, assignedTo, customerId, dealId } = req.body;

      // Role check: Staff can only link tasks to customers and deals they own
      if (req.user!.role === 'staff') {
        if (customerId) {
          const cust = await Customer.findById(customerId);
          if (!cust || cust.ownerId?.toString() !== req.user!._id.toString()) {
            res.status(403).json({ error: 'Access denied: You can only link tasks to customers you own' });
            return;
          }
        }
        if (dealId) {
          const dl = await Deal.findById(dealId);
          if (!dl || dl.ownerId?.toString() !== req.user!._id.toString()) {
            res.status(403).json({ error: 'Access denied: You can only link tasks to deals you own' });
            return;
          }
        }
      }

      // Staff assigns to themselves unless admin specifies another user
      const assignee = req.user!.role === 'admin' && assignedTo ? assignedTo : (assignedTo || req.user!._id);

      const task = await Task.create({
        description,
        priority: priority || 'medium',
        dueDate,
        assignedTo: assignee,
        customerId,
        dealId,
        isCompleted: false,
        createdBy: req.user!._id,
      });

      // Log system activity if linked to customer
      if (customerId) {
        await Activity.create({
          type: 'system',
          content: `Task created: "${description}" (Priority: ${priority}, Due: ${new Date(dueDate).toLocaleDateString()})`,
          customerId,
          dealId,
          createdBy: req.user!._id,
        });
      }

      const populated = await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'customerId', select: 'name company' },
        { path: 'dealId', select: 'title' },
      ]);

      res.status(201).json({ task: populated });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create task: ' + error.message });
    }
  }
);

// PATCH /api/tasks/:id/toggle - Toggle complete/reopen
router.patch(
  '/:id/toggle',
  requireAuth,
  validateParams(paramIdSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      // Role check
      if (req.user!.role === 'staff' && task.assignedTo?.toString() !== req.user!._id.toString()) {
        res.status(403).json({ error: 'Access denied: You can only update tasks assigned to you' });
        return;
      }

      const willBeCompleted = !task.isCompleted;
      task.isCompleted = willBeCompleted;
      task.completedAt = willBeCompleted ? new Date() : undefined;

      await task.save();

      // Log system activity if linked to customer
      if (task.customerId) {
        await Activity.create({
          type: 'system',
          content: willBeCompleted
            ? `Completed task: "${task.description}"`
            : `Reopened task: "${task.description}"`,
          customerId: task.customerId,
          dealId: task.dealId,
          createdBy: req.user!._id,
        });
      }

      const populated = await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'customerId', select: 'name company' },
        { path: 'dealId', select: 'title' },
      ]);

      res.json({ message: 'Task status updated', task: populated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update task status' });
    }
  }
);

// PATCH /api/tasks/:id - General update
router.patch(
  '/:id',
  requireAuth,
  validateParams(paramIdSchema),
  validateBody(updateTaskSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const task = await Task.findById(req.params.id);
      if (!task) {
        res.status(404).json({ error: 'Task not found' });
        return;
      }

      if (req.user!.role === 'staff' && task.assignedTo?.toString() !== req.user!._id.toString()) {
        res.status(403).json({ error: 'Access denied: You can only update tasks assigned to you' });
        return;
      }

      const updates = req.body;
      if (updates.description) task.description = updates.description;
      if (updates.priority) task.priority = updates.priority;
      if (updates.dueDate) task.dueDate = updates.dueDate;
      if (updates.customerId !== undefined) task.customerId = updates.customerId;
      if (updates.dealId !== undefined) task.dealId = updates.dealId;
      if (req.user!.role === 'admin' && updates.assignedTo) {
        task.assignedTo = updates.assignedTo;
      }

      if (typeof updates.isCompleted === 'boolean') {
        const wasCompleted = task.isCompleted;
        task.isCompleted = updates.isCompleted;
        task.completedAt = updates.isCompleted ? new Date() : undefined;

        if (task.customerId && wasCompleted !== updates.isCompleted) {
          await Activity.create({
            type: 'system',
            content: updates.isCompleted
              ? `Completed task: "${task.description}"`
              : `Reopened task: "${task.description}"`,
            customerId: task.customerId,
            dealId: task.dealId,
            createdBy: req.user!._id,
          });
        }
      }

      await task.save();

      const populated = await task.populate([
        { path: 'assignedTo', select: 'name email' },
        { path: 'customerId', select: 'name company' },
        { path: 'dealId', select: 'title' },
      ]);

      res.json({ message: 'Task updated successfully', task: populated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update task' });
    }
  }
);

export default router;
