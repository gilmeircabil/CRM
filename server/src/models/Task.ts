import { Schema, model, Document, Types } from 'mongoose';

export type TaskPriority = 'low' | 'medium' | 'high';

export interface ITask extends Document {
  description: string;
  priority: TaskPriority;
  dueDate: Date;
  assignedTo: Types.ObjectId;
  customerId?: Types.ObjectId;
  dealId?: Types.ObjectId;
  isCompleted: boolean;
  completedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<ITask>(
  {
    description: { type: String, required: true, trim: true },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
      required: true,
    },
    dueDate: { type: Date, required: true, index: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', index: true },
    isCompleted: { type: Boolean, default: false, required: true },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Task = model<ITask>('Task', taskSchema);
