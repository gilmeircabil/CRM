import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { Customer } from '../models/Customer';
import { Deal } from '../models/Deal';
import { Task } from '../models/Task';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// GET /api/dashboard - Aggregated KPI metrics, monthly revenue, pipeline summary, recent deals
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const isStaff = req.user!.role === 'staff';
    const userId = req.user!._id;

    const customerMatch: any = { status: { $ne: 'archived' } };
    const dealMatch: any = {};
    const taskMatch: any = { isCompleted: false };

    if (isStaff) {
      const userObjId = new mongoose.Types.ObjectId(userId.toString());
      customerMatch.ownerId = userObjId;
      dealMatch.ownerId = userObjId;
      taskMatch.assignedTo = userObjId;
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    taskMatch.dueDate = { $lt: now };

    // 1. Total active customers
    const totalCustomersPromise = Customer.countDocuments(customerMatch);

    // 2. New leads in last 30 days
    const newLeadsPromise = Deal.countDocuments({
      ...dealMatch,
      createdAt: { $gte: thirtyDaysAgo },
    });

    // 3. Active deals (not Won or Lost)
    const activeDealsPromise = Deal.countDocuments({
      ...dealMatch,
      stage: { $nin: ['Won', 'Lost'] },
    });

    // 4. Won deals count and revenue
    const wonDealsAggPromise = Deal.aggregate([
      { $match: { ...dealMatch, stage: 'Won' } },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$value' },
          count: { $sum: 1 },
        },
      },
    ]);

    // 5. Lost deals count for conversion rate
    const lostDealsPromise = Deal.countDocuments({
      ...dealMatch,
      stage: 'Lost',
    });

    // 6. Overdue tasks
    const overdueTasksPromise = Task.countDocuments(taskMatch);

    // 7. Recent deals (5 most recently updated)
    const recentDealsPromise = Deal.find(dealMatch)
      .populate('customerId', 'name company')
      .populate('ownerId', 'name email')
      .sort({ updatedAt: -1 })
      .limit(5);

    // 8. Pipeline Summary by stage
    const pipelineSummaryPromise = Deal.aggregate([
      { $match: dealMatch },
      {
        $group: {
          _id: '$stage',
          count: { $sum: 1 },
          totalValue: { $sum: '$value' },
        },
      },
    ]);

    // 9. Monthly revenue for last 12 months (Won deals)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const monthlyRevenuePromise = Deal.aggregate([
      {
        $match: {
          ...dealMatch,
          stage: 'Won',
          closedAt: { $gte: twelveMonthsAgo },
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

    const [
      totalCustomers,
      newLeads,
      activeDeals,
      wonAgg,
      lostCount,
      overdueTasks,
      recentDeals,
      pipelineAgg,
      monthlyAgg,
    ] = await Promise.all([
      totalCustomersPromise,
      newLeadsPromise,
      activeDealsPromise,
      wonDealsAggPromise,
      lostDealsPromise,
      overdueTasksPromise,
      recentDealsPromise,
      pipelineSummaryPromise,
      monthlyRevenuePromise,
    ]);

    const wonCount = wonAgg[0]?.count || 0;
    const revenue = wonAgg[0]?.totalRevenue || 0;
    const closedCount = wonCount + lostCount;
    const conversionRate = closedCount > 0 ? ((wonCount / closedCount) * 100).toFixed(1) : '0.0';

    // Format 6 pipeline stages
    const allStages = ['New Lead', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'];
    const pipelineSummary = allStages.map((stage) => {
      const found = pipelineAgg.find((p) => p._id === stage);
      return {
        stage,
        count: found ? found.count : 0,
        totalValue: found ? found.totalValue : 0,
      };
    });

    // Format last 6-12 months for chart
    const monthNames = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ];
    const monthlyRevenue: { month: string; revenue: number; count: number }[] = [];
    const dateCursor = new Date(twelveMonthsAgo);

    for (let i = 0; i < 12; i++) {
      const year = dateCursor.getFullYear();
      const month = dateCursor.getMonth() + 1;
      const monthLabel = `${monthNames[month - 1]} ${year.toString().slice(2)}`;

      const found = monthlyAgg.find(
        (m) => m._id.year === year && m._id.month === month
      );

      monthlyRevenue.push({
        month: monthLabel,
        revenue: found ? found.revenue : 0,
        count: found ? found.count : 0,
      });

      dateCursor.setMonth(dateCursor.getMonth() + 1);
    }

    res.json({
      kpis: {
        totalCustomers,
        newLeads,
        activeDeals,
        wonDeals: wonCount,
        revenue,
        conversionRate: parseFloat(conversionRate),
        overdueTasks,
      },
      pipelineSummary,
      monthlyRevenue,
      recentDeals,
    });
  } catch (error) {
    console.error('Dashboard aggregation error:', error);
    res.status(500).json({ error: 'Failed to compute dashboard metrics' });
  }
});

export default router;
