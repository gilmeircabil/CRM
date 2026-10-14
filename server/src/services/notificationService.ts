import { Task } from '../models/Task';
import { Notification } from '../models/Notification';

export async function generateTaskNotifications(): Promise<void> {
  try {
    const now = new Date();
    const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Find all incomplete tasks
    const tasks = await Task.find({ isCompleted: false });

    for (const task of tasks) {
      if (!task.dueDate || !task.assignedTo) continue;

      const dueDate = new Date(task.dueDate);
      const shortDesc = task.description.length > 50 
        ? `${task.description.substring(0, 47)}...` 
        : task.description;

      if (dueDate < now) {
        // Overdue notification
        try {
          await Notification.updateOne(
            {
              userId: task.assignedTo,
              taskId: task._id,
              type: 'task_overdue',
            },
            {
              $setOnInsert: {
                userId: task.assignedTo,
                taskId: task._id,
                type: 'task_overdue',
                message: `Overdue task: "${shortDesc}" was due on ${dueDate.toLocaleDateString()}`,
                isRead: false,
              },
            },
            { upsert: true }
          );
        } catch (e) {
          // Ignore duplicate key race conditions
        }
      } else if (dueDate <= in24Hours) {
        // Due soon notification (within 24 hours)
        try {
          await Notification.updateOne(
            {
              userId: task.assignedTo,
              taskId: task._id,
              type: 'task_due_soon',
            },
            {
              $setOnInsert: {
                userId: task.assignedTo,
                taskId: task._id,
                type: 'task_due_soon',
                message: `Task due soon: "${shortDesc}" is due within 24 hours`,
                isRead: false,
              },
            },
            { upsert: true }
          );
        } catch (e) {
          // Ignore duplicate key race conditions
        }
      }
    }
  } catch (error) {
    console.error('Error generating task notifications:', error);
  }
}
