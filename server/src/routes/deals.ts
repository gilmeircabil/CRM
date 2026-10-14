import { Router, Response } from 'express';
import { z } from 'zod';
import { Deal, DealStage } from '../models/Deal';
import { Activity } from '../models/Activity';
import { Customer } from '../models/Customer';
import { Task } from '../models/Task';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateBody, validateParams, validateQuery, objectIdSchema } from '../middleware/validate';

const router = Router();

const dealStages: [DealStage, ...DealStage[]] = [
  'New Lead',
  'Contacted',
  'Qualified',
  'Proposal',
  'Won',
  'Lost',
];

const createDealSchema = z.object({
  title: z.string().min(1, 'Title is required').trim(),
  customerId: objectIdSchema,
  value: z.number().min(0, 'Value must be positive'),
  leadSource: z.string().min(1, 'Lead source is required').trim(),
  stage: z.enum(dealStages).default('New Lead'),
  expectedCloseDate: z.string().transform((v) => new Date(v)),
  ownerId: objectIdSchema.optional(),
});

const updateDealSchema = z.object({
  title: z.string().min(1).trim().optional(),
  customerId: objectIdSchema.optional(),
  value: z.number().min(0).optional(),
  leadSource: z.string().min(1).trim().optional(),
  stage: z.enum(dealStages).optional(),
  expectedCloseDate: z.string().transform((v) => new Date(v)).optional(),
  ownerId: objectIdSchema.optional(),
});

const updateStageSchema = z.object({
  stage: z.enum(dealStages),
});

const dealQuerySchema = z.object({
  filter: z.enum(['all', 'open', 'won', 'lost']).optional().default('all'),
  customerId: objectIdSchema.optional(),
  stage: z.enum(dealStages).optional(),
  limit: z.string().optional().transform((v) => (v ? parseInt(v, 10) : undefined)),
});

const paramIdSchema = z.object({
  id: objectIdSchema,
});

// GET /api/deals - List deals with filtering and role scoping
router.get(
  '/',
  requireAuth,
  validateQuery(dealQuerySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { filter, customerId, stage, limit } = req.query as any;
      const query: any = {};

      // Role Scoping: Staff only sees deals they own
      if (req.user!.role === 'staff') {
        query.ownerId = req.user!._id;
      }

      if (customerId) {
        query.customerId = customerId;
      }

      if (stage) {
        query.stage = stage;
      } else if (filter === 'open') {
        query.stage = { $nin: ['Won', 'Lost'] };
      } else if (filter === 'won') {
        query.stage = 'Won';
      } else if (filter === 'lost') {
        query.stage = 'Lost';
      }

      const dealsQuery = Deal.find(query)
        .populate('customerId', 'name company email phone')
        .populate('ownerId', 'name email')
        .sort({ updatedAt: -1 });

      if (limit) {
        dealsQuery.limit(limit);
      }

      const deals = await dealsQuery.exec();
      res.json({ deals });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch deals' });
    }
  }
);

// POST /api/deals - Create a deal
router.post(
  '/',
  requireAuth,
  validateBody(createDealSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { title, customerId, value, leadSource, stage, expectedCloseDate, ownerId } = req.body;

      // Check customer existence and permission
      const customer = await Customer.findById(customerId);
      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      if (req.user!.role === 'staff' && customer.ownerId.toString() !== req.user!._id.toString()) {
        res.status(403).json({ error: 'You can only create deals for customers you own' });
        return;
      }

      const assignedOwnerId = req.user!.role === 'admin' && ownerId ? ownerId : req.user!._id;
      const isClosed = stage === 'Won' || stage === 'Lost';

      const deal = await Deal.create({
        title,
        customerId,
        value,
        leadSource,
        stage: stage || 'New Lead',
        expectedCloseDate,
        closedAt: isClosed ? new Date() : undefined,
        ownerId: assignedOwnerId,
      });

      // Log activity
      await Activity.create({
        type: 'deal_update',
        content: `Deal "${title}" created with value $${value.toLocaleString()} in stage "${deal.stage}"`,
        customerId,
        dealId: deal._id,
        createdBy: req.user!._id,
      });

      const populated = await deal.populate([
        { path: 'customerId', select: 'name company email phone' },
        { path: 'ownerId', select: 'name email' },
      ]);

      res.status(201).json({ deal: populated });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create deal: ' + error.message });
    }
  }
);

// GET /api/deals/:id - Detail view
router.get(
  '/:id',
  requireAuth,
  validateParams(paramIdSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const deal = await Deal.findById(req.params.id)
        .populate('customerId', 'name company email phone address')
        .populate('ownerId', 'name email');

      if (!deal) {
        res.status(404).json({ error: 'Deal not found' });
        return;
      }

      const ownerIdStr = (deal.ownerId as any)?._id
        ? (deal.ownerId as any)._id.toString()
        : (deal.ownerId as any)?.toString();

      if (req.user!.role === 'staff' && ownerIdStr !== req.user!._id.toString()) {
        res.status(403).json({ error: 'Access denied: You do not own this deal' });
        return;
      }

      const [activities, tasks] = await Promise.all([
        Activity.find({ dealId: deal._id })
          .populate('createdBy', 'name email')
          .sort({ createdAt: -1 }),
        Task.find({ dealId: deal._id })
          .populate('assignedTo', 'name email')
          .sort({ dueDate: 1 }),
      ]);

      res.json({ deal, activities, tasks });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch deal details' });
    }
  }
);

// PATCH /api/deals/:id/stage - Drag-and-drop or quick stage update
router.patch(
  '/:id/stage',
  requireAuth,
  validateParams(paramIdSchema),
  validateBody(updateStageSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const deal = await Deal.findById(req.params.id);
      if (!deal) {
        res.status(404).json({ error: 'Deal not found' });
        return;
      }

      if (req.user!.role === 'staff' && deal.ownerId?.toString() !== req.user!._id.toString()) {
        res.status(403).json({ error: 'Access denied: You do not own this deal' });
        return;
      }

      const oldStage = deal.stage;
      const newStage = req.body.stage;

      if (oldStage !== newStage) {
        deal.stage = newStage;

        // Moving to Won or Lost sets closedAt
        if (newStage === 'Won' || newStage === 'Lost') {
          deal.closedAt = new Date();
        } else {
          deal.closedAt = undefined;
        }

        await deal.save();

        // Create deal_update Activity
        await Activity.create({
          type: 'deal_update',
          content: `Deal "${deal.title}" stage changed from "${oldStage}" to "${newStage}"`,
          customerId: deal.customerId,
          dealId: deal._id,
          createdBy: req.user!._id,
        });
      }

      const populated = await deal.populate([
        { path: 'customerId', select: 'name company email phone' },
        { path: 'ownerId', select: 'name email' },
      ]);

      res.json({ message: 'Stage updated successfully', deal: populated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update deal stage' });
    }
  }
);

// PATCH /api/deals/:id - General update
router.patch(
  '/:id',
  requireAuth,
  validateParams(paramIdSchema),
  validateBody(updateDealSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const deal = await Deal.findById(req.params.id);
      if (!deal) {
        res.status(404).json({ error: 'Deal not found' });
        return;
      }

      if (req.user!.role === 'staff' && deal.ownerId?.toString() !== req.user!._id.toString()) {
        res.status(403).json({ error: 'Access denied: You do not own this deal' });
        return;
      }

      const updates = req.body;
      const oldStage = deal.stage;

      if (updates.title) deal.title = updates.title;
      if (updates.value !== undefined) deal.value = updates.value;
      if (updates.leadSource) deal.leadSource = updates.leadSource;
      if (updates.expectedCloseDate) deal.expectedCloseDate = updates.expectedCloseDate;
      if (updates.customerId) deal.customerId = updates.customerId;
      if (req.user!.role === 'admin' && updates.ownerId) {
        deal.ownerId = updates.ownerId;
      }

      if (updates.stage && updates.stage !== oldStage) {
        deal.stage = updates.stage;
        if (updates.stage === 'Won' || updates.stage === 'Lost') {
          deal.closedAt = new Date();
        } else {
          deal.closedAt = undefined;
        }

        await Activity.create({
          type: 'deal_update',
          content: `Deal "${deal.title}" stage changed from "${oldStage}" to "${updates.stage}"`,
          customerId: deal.customerId,
          dealId: deal._id,
          createdBy: req.user!._id,
        });
      }

      await deal.save();

      const populated = await deal.populate([
        { path: 'customerId', select: 'name company email phone' },
        { path: 'ownerId', select: 'name email' },
      ]);

      res.json({ message: 'Deal updated successfully', deal: populated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update deal' });
    }
  }
);

export default router;
