import { Schema, model, Document, Types } from 'mongoose';

export type NotificationType = 'task_due_soon' | 'task_overdue';

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: NotificationType;
  message: string;
  taskId: Types.ObjectId;
  isRead: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['task_due_soon', 'task_overdue'],
      required: true,
      index: true,
    },
    message: { type: String, required: true },
    taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
    isRead: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

// Ensure uniqueness per user, task, and notification type to prevent duplicate notifications
notificationSchema.index({ userId: 1, taskId: 1, type: 1 }, { unique: true });

export const Notification = model<INotification>('Notification', notificationSchema);
