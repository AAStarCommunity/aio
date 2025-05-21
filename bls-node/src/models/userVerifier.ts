import mongoose, { Schema, Document } from 'mongoose';
import { UserVerifier } from '../types';

// 用户验证器文档接口
export interface IUserVerifierDocument extends UserVerifier, Document {}

// 用户验证器模式
const userVerifierSchema = new Schema<IUserVerifierDocument>({
  userId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  credentialID: {
    type: String,
    required: true,
    unique: true
  },
  credentialPublicKey: {
    type: String,
    required: true
  },
  counter: {
    type: Number,
    required: true,
    default: 0
  }
}, {
  timestamps: true // 添加 createdAt 和 updatedAt 字段
});

// 创建模型
export const UserVerifierModel = mongoose.model<IUserVerifierDocument>('UserVerifier', userVerifierSchema); 