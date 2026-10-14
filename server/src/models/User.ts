import { Schema, model, Document } from 'mongoose';

export type UserRole = 'admin' | 'staff';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'staff'], default: 'staff', required: true },
    isActive: { type: Boolean, default: true, required: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

// Never return passwordHash in JSON serialization
userSchema.set('toJSON', {
  transform: (_doc, ret: any) => {
    delete ret.passwordHash;
    return ret;
  },
});

export const User = model<IUser>('User', userSchema);
