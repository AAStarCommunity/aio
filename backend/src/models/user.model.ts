import { Schema, Document, model } from 'mongoose';

export interface IUser extends Document {
  email: string;
  credentialId: string;
  credentialPublicKey: Buffer;
  counter: number;
  aaAddress: string;
}

const userSchema = new Schema<IUser>({
  email: {
    type: String,
    required: true,
    unique: true
  },
  credentialId: {
    type: String,
    required: true,
    unique: true,
    get: (v: string) => Buffer.from(v, 'base64url').toString(),
    set: (v: string) => Buffer.from(v).toString('base64url')
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
    required: true
  }
}, {
  timestamps: true,
  collection: 'users'
});

export const UserSchema = userSchema;
export const User = model<IUser>('User', userSchema); 