import { Router, Response } from 'express';
import { z } from 'zod';
import { Customer } from '../models/Customer';
import { Deal } from '../models/Deal';
import { Task } from '../models/Task';
import { Activity } from '../models/Activity';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateBody, validateParams, validateQuery, objectIdSchema } from '../middleware/validate';
import { escapeRegex } from '../middleware/sanitize';

const router = Router();

const createCustomerSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('Valid email is required').trim().toLowerCase(),
  phone: z.string().min(1, 'Phone is required').trim(),
  company: z.string().min(1, 'Company is required').trim(),
  jobTitle: z.string().min(1, 'Job title is required').trim(),
  address: z.string().trim().optional(),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  ownerId: objectIdSchema.optional(),
});

const updateCustomerSchema = z.object({
  name: z.string().min(1).trim().optional(),
  email: z.string().email().trim().toLowerCase().optional(),
  phone: z.string().min(1).trim().optional(),
  company: z.string().min(1).trim().optional(),
  jobTitle: z.string().min(1).trim().optional(),
  address: z.string().trim().optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
  ownerId: objectIdSchema.optional(),
});

const customerQuerySchema = z.object({
  page: z.string().optional().default('1').transform((v) => parseInt(v, 10) || 1),
  limit: z.string().optional().default('10').transform((v) => parseInt(v, 10) || 10),
  search: z.string().optional(),
  status: z.enum(['active', 'inactive', 'archived', 'all']).optional().default('all'),
  ownerId: objectIdSchema.optional(),
});

const paramIdSchema = z.object({
  id: objectIdSchema,
});

// GET /api/customers - Paginated, filtered, searched list
router.get(
  '/',
  requireAuth,
  validateQuery(customerQuerySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { page, limit, search, status, ownerId } = (req.query as any);
      const query: any = {};

      // Role Scoping: Staff only sees customers they own
      if (req.user!.role === 'staff') {
        query.ownerId = req.user!._id;
      } else if (ownerId) {
        query.ownerId = ownerId;
      }

      // Filter by status
      if (status && status !== 'all') {
        query.status = status;
      }

      // Search across name, email, company
      if (search && search.trim()) {
        const escaped = escapeRegex(search.trim());
        // Limit search length and prevent catastrophic backtracking
        if (escaped.length > 100) {
          res.status(400).json({ error: 'Search query too long' });
          return;
        }
        const safeRegex = new RegExp(escaped, 'i');
        query.$or = [{ name: safeRegex }, { email: safeRegex }, { company: safeRegex }];
      }

      const total = await Customer.countDocuments(query);
      const customers = await Customer.find(query)
        .populate('ownerId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit);

      res.json({
        customers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
        },
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch customers' });
    }
  }
);

// POST /api/customers - Create new customer
router.post(
  '/',
  requireAuth,
  validateBody(createCustomerSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { name, email, phone, company, jobTitle, address, status, ownerId } = req.body;

      // Staff cannot assign customer to someone else
      const assignedOwnerId = req.user!.role === 'admin' && ownerId ? ownerId : req.user!._id;

      const customer = await Customer.create({
        name,
        email,
        phone,
        company,
        jobTitle,
        address,
        status: status || 'active',
        ownerId: assignedOwnerId,
        createdBy: req.user!._id,
      });

      // Log initial system activity
      await Activity.create({
        type: 'system',
        content: `Customer profile created for ${name} (${company})`,
        customerId: customer._id,
        createdBy: req.user!._id,
      });

      const populated = await customer.populate('ownerId', 'name email');
      res.status(201).json({ customer: populated });
    } catch (error: any) {
      res.status(500).json({ error: 'Failed to create customer: ' + error.message });
    }
  }
);

// GET /api/customers/:id - Get detail with deals, tasks, and activities
router.get(
  '/:id',
  requireAuth,
  validateParams(paramIdSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const customer = await Customer.findById(req.params.id)
        .populate('ownerId', 'name email')
        .populate('createdBy', 'name email');

      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      // Role Scoping: Staff can only view their own customers
      const ownerIdStr = (customer.ownerId as any)?._id
        ? (customer.ownerId as any)._id.toString()
        : (customer.ownerId as any)?.toString();

      if (req.user!.role === 'staff' && ownerIdStr !== req.user!._id.toString()) {
        res.status(403).json({ error: 'Access denied: You do not own this customer record' });
        return;
      }

      // Fetch linked deals, tasks, and activities
      const dealQuery: any = { customerId: customer._id };
      const taskQuery: any = { customerId: customer._id };
      if (req.user!.role === 'staff') {
        dealQuery.ownerId = req.user!._id;
        taskQuery.assignedTo = req.user!._id;
      }

      const [deals, tasks, activities] = await Promise.all([
        Deal.find(dealQuery).populate('ownerId', 'name email').sort({ createdAt: -1 }),
        Task.find(taskQuery).populate('assignedTo', 'name email').sort({ dueDate: 1 }),
        Activity.find({ customerId: customer._id })
          .populate('createdBy', 'name email')
          .sort({ createdAt: -1 }),
      ]);

      res.json({
        customer,
        deals,
        tasks,
        activities,
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch customer details' });
    }
  }
);

// PATCH /api/customers/:id - Update customer
router.patch(
  '/:id',
  requireAuth,
  validateParams(paramIdSchema),
  validateBody(updateCustomerSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const customer = await Customer.findById(req.params.id);
      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      // Role Scoping
      if (req.user!.role === 'staff' && customer.ownerId?.toString() !== req.user!._id.toString()) {
        res.status(403).json({ error: 'Access denied: You cannot edit other staff members\' customers' });
        return;
      }

      const updates = req.body;
      if (updates.name) customer.name = updates.name;
      if (updates.email) customer.email = updates.email;
      if (updates.phone) customer.phone = updates.phone;
      if (updates.company) customer.company = updates.company;
      if (updates.jobTitle) customer.jobTitle = updates.jobTitle;
      if (updates.address !== undefined) customer.address = updates.address;
      if (updates.status) customer.status = updates.status;
      if (req.user!.role === 'admin' && updates.ownerId) {
        customer.ownerId = updates.ownerId;
      }

      await customer.save();
      const populated = await customer.populate('ownerId', 'name email');
      res.json({ message: 'Customer updated successfully', customer: populated });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update customer' });
    }
  }
);

// POST /api/customers/:id/archive - Soft delete
router.post(
  '/:id/archive',
  requireAuth,
  validateParams(paramIdSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const customer = await Customer.findById(req.params.id);
      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      if (req.user!.role === 'staff' && customer.ownerId?.toString() !== req.user!._id.toString()) {
        res.status(403).json({ error: 'Access denied: You cannot archive this customer' });
        return;
      }

      customer.status = 'archived';
      await customer.save();

      await Activity.create({
        type: 'system',
        content: `Customer archived`,
        customerId: customer._id,
        createdBy: req.user!._id,
      });

      res.json({ message: 'Customer archived successfully', customer });
    } catch (error) {
      res.status(500).json({ error: 'Failed to archive customer' });
    }
  }
);

// POST /api/customers/:id/restore - Restore soft deleted customer
router.post(
  '/:id/restore',
  requireAuth,
  validateParams(paramIdSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const customer = await Customer.findById(req.params.id);
      if (!customer) {
        res.status(404).json({ error: 'Customer not found' });
        return;
      }

      if (req.user!.role === 'staff' && customer.ownerId?.toString() !== req.user!._id.toString()) {
        res.status(403).json({ error: 'Access denied: You cannot restore this customer' });
        return;
      }

      customer.status = 'active';
      await customer.save();

      await Activity.create({
        type: 'system',
        content: `Customer restored to active status`,
        customerId: customer._id,
        createdBy: req.user!._id,
      });

      res.json({ message: 'Customer restored successfully', customer });
    } catch (error) {
      res.status(500).json({ error: 'Failed to restore customer' });
    }
  }
);

export default router;
