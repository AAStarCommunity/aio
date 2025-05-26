import mongoose, { Document, Schema } from 'mongoose';

export interface IUser extends Document {
  email: string;
  credentialId: string;
  credentialPublicKey: Buffer;
  counter: number;
  aaAddress: string;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    credentialId: {
      type: String,
      required: true,
      unique: true,
    },
    credentialPublicKey: {
      type: Buffer,
      required: true,
    },
    counter: {
      type: Number,
      required: true,
      default: 0,
    },
    aaAddress: {
      type: String,
      required: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  }
);

// 创建索引
userSchema.index({ email: 1 });
userSchema.index({ credentialId: 1 });
userSchema.index({ aaAddress: 1 });

export const User = mongoose.model<IUser>('User', userSchema); 