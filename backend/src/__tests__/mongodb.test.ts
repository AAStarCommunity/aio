/// <reference types="jest" />

import { describe, expect, it, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import config from '../config/config';

describe('MongoDB 直接连接测试', () => {
  beforeAll(async () => {
    // 使用实际的 MongoDB 连接
    const mongoUri = config().mongoUri;
    console.log('正在连接到 MongoDB:', mongoUri);
    
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 30000,
        maxPoolSize: 10,
        heartbeatFrequencyMS: 2000,
      });
      console.log('成功连接到 MongoDB');
    } catch (error) {
      console.error('MongoDB 连接失败:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await mongoose.disconnect();
    console.log('已断开 MongoDB 连接');
  });

  // 测试基本的 CRUD 操作
  it('应该能够执行基本的 CRUD 操作', async () => {
    // 1. 创建测试集合
    const TestModel = mongoose.model('Test', new mongoose.Schema({
      name: String,
      value: Number
    }));

    // 2. 创建文档
    const testDoc = new TestModel({
      name: 'test',
      value: 123
    });
    await testDoc.save();
    console.log('成功创建文档:', testDoc);

    // 3. 查询文档
    const foundDoc = await TestModel.findOne({ name: 'test' });
    console.log('查询到的文档:', foundDoc);
    expect(foundDoc).toBeTruthy();
    expect(foundDoc?.name).toBe('test');
    expect(foundDoc?.value).toBe(123);

    // 4. 更新文档
    const updateResult = await TestModel.updateOne(
      { name: 'test' },
      { value: 456 }
    );
    console.log('更新结果:', updateResult);
    expect(updateResult.modifiedCount).toBe(1);

    // 5. 验证更新
    const updatedDoc = await TestModel.findOne({ name: 'test' });
    expect(updatedDoc?.value).toBe(456);

    // 6. 删除文档
    const deleteResult = await TestModel.deleteOne({ name: 'test' });
    console.log('删除结果:', deleteResult);
    expect(deleteResult.deletedCount).toBe(1);

    // 7. 验证删除
    const deletedDoc = await TestModel.findOne({ name: 'test' });
    expect(deletedDoc).toBeNull();
  });

  // 测试批量操作
  it('应该能够执行批量操作', async () => {
    const TestModel = mongoose.model('TestBulk', new mongoose.Schema({
      name: String,
      value: Number
    }));

    // 批量插入
    const bulkDocs = await TestModel.insertMany([
      { name: 'test1', value: 1 },
      { name: 'test2', value: 2 },
      { name: 'test3', value: 3 }
    ]);
    console.log('批量插入结果:', bulkDocs);
    expect(bulkDocs.length).toBe(3);

    // 批量查询
    const foundDocs = await TestModel.find({
      name: { $in: ['test1', 'test2', 'test3'] }
    });
    expect(foundDocs.length).toBe(3);

    // 清理数据
    await TestModel.deleteMany({});
  });
}); 