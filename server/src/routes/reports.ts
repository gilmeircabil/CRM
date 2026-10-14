import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { z } from 'zod';
import { Deal } from '../models/Deal';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateQuery } from '../middleware/validate';

const router = Router();

const reportQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

// GET /api/reports/sales
router.get(
  '/sales',
  requireAuth,
  validateQuery(reportQuerySchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query as any;
      const isStaff = req.user!.role === 'staff';
      const userId = req.user!._id;

      const dealMatch: any = {};
      if (isStaff) {
        dealMatch.ownerId = new mongoose.Types.ObjectId(userId.toString());
      }

      if (startDate || endDate) {
        dealMatch.createdAt = {};
        if (startDate) dealMatch.createdAt.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          dealMatch.createdAt.$lte = end;
        }
      }

      // 1. Deals by stage
      const dealsByStageAgg = await Deal.aggregate([
        { $match: dealMatch },
        {
          $group: {
            _id: '$stage',
            count: { $sum: 1 },
            totalValue: { $sum: '$value' },
          },
        },
      ]);

      const allStages = ['New Lead', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];
      const dealsByStage = allStages.map((stage) => {
        const found = dealsByStageAgg.find((d) => d._id === stage);
        return {
          stage,
          count: found ? found.count : 0,
          totalValue: found ? found.totalValue : 0,
        };
      });

      // 2. Win rate calculation
      const wonCount = dealsByStageAgg.find((d) => d._id === 'Won')?.count || 0;
      const wonValue = dealsByStageAgg.find((d) => d._id === 'Won')?.totalValue || 0;
      const lostCount = dealsByStageAgg.find((d) => d._id === 'Lost')?.count || 0;
      const totalClosed = wonCount + lostCount;
      const winRate = totalClosed > 0 ? parseFloat(((wonCount / totalClosed) * 100).toFixed(1)) : 0;

      // 3. Revenue by lead source
      const revenueByLeadSourceAgg = await Deal.aggregate([
        { $match: { ...dealMatch, stage: 'Won' } },
        {
          $group: {
            _id: '$leadSource',
            revenue: { $sum: '$value' },
            dealCount: { $sum: 1 },
          },
        },
        { $sort: { revenue: -1 } },
      ]);

      const revenueByLeadSource = revenueByLeadSourceAgg.map((item) => ({
        source: item._id || 'Unknown',
        revenue: item.revenue,
        dealCount: item.dealCount,
      }));

      // 4. Monthly revenue (Won deals within time range)
      const monthlyRevenueAgg = await Deal.aggregate([
        {
          $match: {
            ...dealMatch,
            stage: 'Won',
            closedAt: { $exists: true, $ne: null },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: '$closedAt' },
              month: { $month: '$closedAt' },
            },
            revenue: { $sum: '$value' },
            count: { $sum: 1 },
          },
        },
        { $sort: { '_id.year': 1, '_id.month': 1 } },
      ]);

      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      const monthlyRevenue = monthlyRevenueAgg.map((m) => ({
        month: `${monthNames[m._id.month - 1]} ${m._id.year}`,
        revenue: m.revenue,
        count: m.count,
      }));

      // 5. Revenue by Owner (Admin only)
      let revenueByOwner: any[] = [];
      if (req.user!.role === 'admin') {
        const ownerAgg = await Deal.aggregate([
          { $match: { ...dealMatch, stage: 'Won' } },
          {
            $group: {
              _id: '$ownerId',
              totalRevenue: { $sum: '$value' },
              wonDeals: { $sum: 1 },
            },
          },
          {
            $lookup: {
              from: 'users',
              localField: '_id',
              foreignField: '_id',
              as: 'owner',
            },
          },
          { $unwind: { path: '$owner', preserveNullAndEmptyArrays: true } },
          {
            $project: {
              ownerName: { $ifNull: ['$owner.name', 'Unassigned'] },
              ownerEmail: { $ifNull: ['$owner.email', ''] },
              totalRevenue: 1,
              wonDeals: 1,
            },
          },
          { $sort: { totalRevenue: -1 } },
        ]);
        revenueByOwner = ownerAgg;
      }

      res.json({
        summary: {
          wonCount,
          wonValue,
          lostCount,
          totalClosed,
          winRate,
        },
        dealsByStage,
        revenueByLeadSource,
        monthlyRevenue,
        revenueByOwner,
      });
    } catch (error) {
      console.error('Report generation error:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }
);

export default router;
