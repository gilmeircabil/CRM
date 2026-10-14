import { Router, Response } from 'express';
import { z } from 'zod';
import { Activity, ActivityType } from '../models/Activity';
import { Customer } from '../models/Customer';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateBody, validateQuery, objectIdSchema } from '../middleware/validate';

const router = Router();

const activityTypes: [ActivityType, ...ActivityType[]] = [
  'note',
  'call',
  'meeting',
  'deal_update',
  'system',
];

const createActivitySchema = z.object({
  type: z.enum(['note', 'call', 'meeting']),
  content: z.string().min(1, 'Content is required').trim(),
  customerId: objectIdSchema,
  dealId: objectIdSchema.optional(),
});

const activityQuerySchema = z.object({
  customerId: objectIdSchema.optional(),
  dealId: objectIdSchema.optional(),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : 50)),
});

// GET /api/activities - Reverse-chronological timeline
router.get(
  '/',
  requireAuth,
  validateQuery(activityQuerySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { customerId, dealId, limit } = req.query as any;
      const query: any = {};

      if (customerId) query.customerId = customerId;
      if (dealId) query.dealId = dealId;

      // If customer specified, check permission for staff
      if (customerId && req.user!.role === 'staff') {
        const customer = await Customer.findById(customerId);
        if (!customer || customer.ownerId?.toString() !== req.user!._id.toString()) {
          res.status(403).json({ error: 'Access denied: You do not own this customer record' });
          return;
        }
      }

      const activities = await Activity.find(query)
        .populate('createdBy', 'name email')
        .populate('dealId', 'title')
        .sort({ createdAt: -1 })
        .limit(limit || 50);

      res.json({ activities });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch activities' });
    }
  }
);

// POST /api/activities - Create note, call log, or meeting record
router.post(
  '/',
  requireAuth,
  validateBody(createActivitySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { type, content, customerId, dealId } = req.body;

      const customer = await Customer.findById(customerId);
      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      if (req.user!.role === 'staff' && customer.ownerId?.toString() !== req.user!._id.toString()) {
        res.status(403).json({ error: 'Access denied: You do not own this customer record' });
        return;
      }

      const activity = await Activity.create({
        type,
        content,
        customerId,
        dealId,
        createdBy: req.user!._id,
      });

      const populated = await activity.populate([
        { path: 'createdBy', select: 'name email' },
        { path: 'dealId', select: 'title' },
      ]);

      res.status(201).json({ activity: populated });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create activity: ' + error.message });
    }
  }
);

export default router;
