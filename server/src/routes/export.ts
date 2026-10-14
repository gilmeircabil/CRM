import { Router, Response } from 'express';
import ExcelJS from 'exceljs';
import { z } from 'zod';
import { Customer } from '../models/Customer';
import { Deal } from '../models/Deal';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';

const router = Router();

const exportQuerySchema = z.object({
  format: z.enum(['csv', 'xlsx']).default('csv'),
});

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// GET /api/export/customers
router.get(
  '/customers',
  requireAuth,
  validateQuery(exportQuerySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { format } = req.query as any;
      const isStaff = req.user!.role === 'staff';
      const query: any = {};

      if (isStaff) {
        query.ownerId = req.user!._id;
      }

      const customers = await Customer.find(query)
        .populate('ownerId', 'name email')
        .sort({ createdAt: -1 });

      if (format === 'csv') {
        const headers = ['ID', 'Name', 'Email', 'Phone', 'Company', 'Job Title', 'Address', 'Status', 'Owner Name', 'Owner Email', 'Created At'];
        const rows = customers.map((c: any) => [
          escapeCsvField(c._id),
          escapeCsvField(c.name),
          escapeCsvField(c.email),
          escapeCsvField(c.phone),
          escapeCsvField(c.company),
          escapeCsvField(c.jobTitle),
          escapeCsvField(c.address || ''),
          escapeCsvField(c.status),
          escapeCsvField(c.ownerId?.name || 'Unassigned'),
          escapeCsvField(c.ownerId?.email || ''),
          escapeCsvField(new Date(c.createdAt).toISOString()),
        ]);

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="customers.csv"');
        res.send(csvContent);
        return;
      }

      // XLSX format via exceljs
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Customers');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 25 },
        { header: 'Name', key: 'name', width: 20 },
        { header: 'Email', key: 'email', width: 25 },
        { header: 'Phone', key: 'phone', width: 18 },
        { header: 'Company', key: 'company', width: 22 },
        { header: 'Job Title', key: 'jobTitle', width: 20 },
        { header: 'Address', key: 'address', width: 30 },
        { header: 'Status', key: 'status', width: 12 },
        { header: 'Owner Name', key: 'ownerName', width: 20 },
        { header: 'Owner Email', key: 'ownerEmail', width: 25 },
        { header: 'Created At', key: 'createdAt', width: 22 },
      ];

      customers.forEach((c: any) => {
        worksheet.addRow({
          id: c._id.toString(),
          name: c.name,
          email: c.email,
          phone: c.phone,
          company: c.company,
          jobTitle: c.jobTitle,
          address: c.address || '',
          status: c.status,
          ownerName: c.ownerId?.name || 'Unassigned',
          ownerEmail: c.ownerId?.email || '',
          createdAt: new Date(c.createdAt).toISOString(),
        });
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="customers.xlsx"');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Customer export error:', error);
      res.status(500).json({ error: 'Failed to export customers' });
    }
  }
);

// GET /api/export/deals
router.get(
  '/deals',
  requireAuth,
  validateQuery(exportQuerySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { format } = req.query as any;
      const isStaff = req.user!.role === 'staff';
      const query: any = {};

      if (isStaff) {
        query.ownerId = req.user!._id;
      }

      const deals = await Deal.find(query)
        .populate('customerId', 'name company email')
        .populate('ownerId', 'name email')
        .sort({ createdAt: -1 });

      if (format === 'csv') {
        const headers = ['ID', 'Title', 'Customer Name', 'Customer Company', 'Value ($)', 'Lead Source', 'Stage', 'Expected Close Date', 'Closed At', 'Owner Name', 'Created At'];
        const rows = deals.map((d: any) => [
          escapeCsvField(d._id),
          escapeCsvField(d.title),
          escapeCsvField(d.customerId?.name || 'Unknown'),
          escapeCsvField(d.customerId?.company || 'Unknown'),
          escapeCsvField(d.value),
          escapeCsvField(d.leadSource),
          escapeCsvField(d.stage),
          escapeCsvField(d.expectedCloseDate ? new Date(d.expectedCloseDate).toISOString() : ''),
          escapeCsvField(d.closedAt ? new Date(d.closedAt).toISOString() : ''),
          escapeCsvField(d.ownerId?.name || 'Unassigned'),
          escapeCsvField(new Date(d.createdAt).toISOString()),
        ]);

        const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="deals.csv"');
        res.send(csvContent);
        return;
      }

      // XLSX format via exceljs
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Deals');

      worksheet.columns = [
        { header: 'ID', key: 'id', width: 25 },
        { header: 'Title', key: 'title', width: 25 },
        { header: 'Customer Name', key: 'customerName', width: 20 },
        { header: 'Customer Company', key: 'customerCompany', width: 22 },
        { header: 'Value ($)', key: 'value', width: 14 },
        { header: 'Lead Source', key: 'leadSource', width: 18 },
        { header: 'Stage', key: 'stage', width: 15 },
        { header: 'Expected Close Date', key: 'expectedCloseDate', width: 20 },
        { header: 'Closed At', key: 'closedAt', width: 20 },
        { header: 'Owner Name', key: 'ownerName', width: 20 },
        { header: 'Created At', key: 'createdAt', width: 22 },
      ];

      deals.forEach((d: any) => {
        worksheet.addRow({
          id: d._id.toString(),
          title: d.title,
          customerName: d.customerId?.name || 'Unknown',
          customerCompany: d.customerId?.company || 'Unknown',
          value: d.value,
          leadSource: d.leadSource,
          stage: d.stage,
          expectedCloseDate: d.expectedCloseDate ? new Date(d.expectedCloseDate).toISOString() : '',
          closedAt: d.closedAt ? new Date(d.closedAt).toISOString() : '',
          ownerName: d.ownerId?.name || 'Unassigned',
          createdAt: new Date(d.createdAt).toISOString(),
        });
      });

      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', 'attachment; filename="deals.xlsx"');

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      console.error('Deals export error:', error);
      res.status(500).json({ error: 'Failed to export deals' });
    }
  }
);

export default router;
