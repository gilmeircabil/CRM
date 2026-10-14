import { Router, Response } from 'express';
import { z } from 'zod';
import { Customer } from '../models/Customer';
import { Activity } from '../models/Activity';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateBody } from '../middleware/validate';

const router = Router();

const contactRowSchema = z.object({
  name: z.string().min(1, 'Name is required').trim(),
  email: z.string().email('Invalid email address').trim().toLowerCase(),
  phone: z.string().min(1, 'Phone is required').trim(),
  company: z.string().min(1, 'Company is required').trim(),
  jobTitle: z.string().min(1, 'Job title is required').trim(),
  address: z.string().trim().optional(),
});

const importContactsSchema = z.object({
  contacts: z.array(z.record(z.any())).max(1000, 'Maximum 1000 contacts per import batch'),
});

// POST /api/import/customers
router.post(
  '/customers',
  requireAuth,
  validateBody(importContactsSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const rawRows = req.body.contacts;
      const errors: Array<{ row: number; message: string }> = [];
      const validRows: Array<{
        name: string;
        email: string;
        phone: string;
        company: string;
        jobTitle: string;
        address?: string;
      }> = [];
      const seenEmailsInBatch = new Set<string>();
      let skippedCount = 0;

      // 1. Validate each row
      for (let i = 0; i < rawRows.length; i++) {
        const rowNum = i + 1;
        const row = rawRows[i];

        const parseResult = contactRowSchema.safeParse(row);
        if (!parseResult.success) {
          const errMsg = parseResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
          errors.push({ row: rowNum, message: errMsg });
          continue;
        }

        const data = parseResult.data;
        if (seenEmailsInBatch.has(data.email)) {
          skippedCount++;
          continue;
        }

        seenEmailsInBatch.add(data.email);
        validRows.push(data);
      }

      // 2. Check for existing emails in database
      const candidateEmails = validRows.map((r) => r.email);
      const existingCustomers = await Customer.find({ email: { $in: candidateEmails } }).select('email');
      const existingEmailSet = new Set(existingCustomers.map((c) => c.email.toLowerCase()));

      const toInsert: any[] = [];
      for (const row of validRows) {
        if (existingEmailSet.has(row.email)) {
          skippedCount++;
        } else {
          toInsert.push({
            name: row.name,
            email: row.email,
            phone: row.phone,
            company: row.company,
            jobTitle: row.jobTitle,
            address: row.address || '',
            status: 'active',
            ownerId: req.user!._id,
            createdBy: req.user!._id,
          });
        }
      }

      let importedCount = 0;
      if (toInsert.length > 0) {
        const createdDocs = await Customer.insertMany(toInsert);
        importedCount = createdDocs.length;

        // Log system activities
        const activities = createdDocs.map((doc) => ({
          type: 'system' as const,
          content: `Imported via CSV: ${doc.name} (${doc.company})`,
          customerId: doc._id,
          createdBy: req.user!._id,
        }));
        await Activity.insertMany(activities);
      }

      res.json({
        imported: importedCount,
        skipped: skippedCount,
        errors,
      });
    } catch (error: any) {
      console.error('Import error:', error);
      res.status(500).json({ error: 'Failed to process import: ' + error.message });
    }
  }
);

export default router;
