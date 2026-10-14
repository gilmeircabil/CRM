import { Schema, model, Document, Types } from 'mongoose';

export type CustomerStatus = 'active' | 'inactive' | 'archived';

export interface ICustomer extends Document {
  name: string;
  email: string;
  phone: string;
  company: string;
  jobTitle: string;
  address?: string;
  status: CustomerStatus;
  ownerId: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const customerSchema = new Schema<ICustomer>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    phone: { type: String, required: true, trim: true },
    company: { type: String, required: true, trim: true },
    jobTitle: { type: String, required: true, trim: true },
    address: { type: String, trim: true },
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
      required: true,
      index: true,
    },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

export const Customer = model<ICustomer>('Customer', customerSchema);
