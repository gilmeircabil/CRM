import { Schema, model, Document, Types } from 'mongoose';

export type DealStage = 'New Lead' | 'Contacted' | 'Qualified' | 'Proposal' | 'Won' | 'Lost';

export interface IDeal extends Document {
  title: string;
  customerId: Types.ObjectId;
  value: number;
  leadSource: string;
  stage: DealStage;
  expectedCloseDate: Date;
  closedAt?: Date;
  ownerId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const dealSchema = new Schema<IDeal>(
  {
    title: { type: String, required: true, trim: true },
    customerId: { type: Schema.Types.ObjectId, ref: 'Customer', required: true, index: true },
    value: { type: Number, required: true, min: 0 },
    leadSource: { type: String, required: true, trim: true },
    stage: {
      type: String,
      enum: ['New Lead', 'Contacted', 'Qualified', 'Proposal', 'Won', 'Lost'],
      default: 'New Lead',
      required: true,
      index: true,
    },
    expectedCloseDate: { type: Date, required: true },
    closedAt: { type: Date },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  },
  { timestamps: true }
);

export const Deal = model<IDeal>('Deal', dealSchema);
