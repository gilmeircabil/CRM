import { Router, Response } from 'express';
import { z } from 'zod';
import { Customer } from '../models/Customer';
import { Deal } from '../models/Deal';
import { Task } from '../models/Task';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';
import { escapeRegex } from '../middleware/sanitize';

const router = Router();

const searchQuerySchema = z.object({
  q: z.string().min(1, 'Search query cannot be empty').trim(),
});

// GET /api/search?q=query
router.get(
  '/',
  requireAuth,
  validateQuery(searchQuerySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const q = (req.query as any).q;
      const safeRegex = new RegExp(escapeRegex(q), 'i');
      const isStaff = req.user!.role === 'staff';
      const userId = req.user!._id;

      const customerQuery: any = {
        status: { $ne: 'archived' },
        $or: [{ name: safeRegex }, { email: safeRegex }, { company: safeRegex }],
      };
      const dealQuery: any = {
        title: safeRegex,
      };
      const taskQuery: any = {
        description: safeRegex,
      };

      if (isStaff) {
        customerQuery.ownerId = userId;
        dealQuery.ownerId = userId;
        taskQuery.assignedTo = userId;
      }

      const [customers, deals, tasks] = await Promise.all([
        Customer.find(customerQuery).limit(5).select('name company email'),
        Deal.find(dealQuery).limit(5).select('title value stage'),
        Task.find(taskQuery).limit(5).select('description dueDate priority isCompleted'),
      ]);

      res.json({
        customers,
        deals,
        tasks,
      });
    } catch (error) {
      res.status(500).json({ error: 'Search failed' });
    }
  }
);

export default router;
