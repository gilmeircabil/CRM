import { Schema, model, Document, Types } from 'mongoose';

export type ActivityType = 'note' | 'call' | 'meeting' | 'deal_update' | 'system';

export interface IActivity extends Document {
  type: ActivityType;
  content: string;
  customerId: Types.ObjectId;
  dealId?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const activitySchema = new Schema<IActivity>(
  {
    type: {
      type: String,
      enum: ['note', 'call', 'meeting', 'deal_update', 'system'],
      required: true,
      index: true,
    },
    content: { type: String, required: true, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Activity = model<IActivity>('Activity', activitySchema);
