import mongoose from 'mongoose';

export interface IUser {
  email: string;
  credentialId: string;
  credentialPublicKey: Buffer;
  counter: number;
  aaAddress: string;
}

const userSchema = new mongoose.Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true
  },
  credentialId: {
    type: String,
    required: true,
    unique: true
  },
  credentialPublicKey: {
    type: Buffer,
    required: true
  },
  counter: {
    type: Number,
    required: true,
    default: 0
  },
  aaAddress: {
    type: String,
    required: true,
    unique: true
  }
}, {
  timestamps: true
});

export const User = mongoose.model<IUser>('User', userSchema); 