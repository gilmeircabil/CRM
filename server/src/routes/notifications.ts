import { Router, Response } from 'express';
import { z } from 'zod';
import { Notification } from '../models/Notification';
import { generateTaskNotifications } from '../services/notificationService';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { validateParams, objectIdSchema } from '../middleware/validate';

const router = Router();

const paramIdSchema = z.object({
  id: objectIdSchema,
});

// GET /api/notifications - Generate & fetch notifications for current user
router.get('/', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    // Generate any newly due soon or overdue task notifications
    await generateTaskNotifications();

    const notifications = await Notification.find({ userId: req.user!._id })
      .populate({
        path: 'taskId',
        select: 'description dueDate priority customerId dealId isCompleted',
        populate: [
          { path: 'customerId', select: 'name company' },
          { path: 'dealId', select: 'title' },
        ],
      })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = await Notification.countDocuments({
      userId: req.user!._id,
      isRead: false,
    });

    res.json({
      notifications,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications/:id/read - Mark single notification read
router.patch(
  '/:id/read',
  requireAuth,
  validateParams(paramIdSchema),
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, userId: req.user!._id },
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }

      const unreadCount = await Notification.countDocuments({
        userId: req.user!._id,
        isRead: false,
      });

      res.json({ message: 'Marked as read', notification, unreadCount });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update notification' });
    }
  }
);

// POST /api/notifications/mark-all-read - Mark all read
router.post('/mark-all-read', requireAuth, async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    await Notification.updateMany({ userId: req.user!._id, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read', unreadCount: 0 });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications read' });
  }
});

export default router;
