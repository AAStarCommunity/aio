import blsService from '../services/blsService';

describe('BLS签名服务', () => {
  const testMessage = 'Hello, BLS!';

  test('应该能够生成公钥', () => {
    const publicKey = blsService.getPublicKey();
    expect(publicKey).toBeDefined();
    expect(typeof publicKey).toBe('string');
    expect(publicKey.length).toBeGreaterThan(0);
  });

  test('应该能够签名消息', async () => {
    const signature = await blsService.sign(testMessage);
    expect(signature).toBeDefined();
    expect(typeof signature).toBe('string');
    expect(signature.length).toBeGreaterThan(0);
  });

  test('应该能够验证签名', async () => {
    const signature = await blsService.sign(testMessage);
    const publicKey = blsService.getPublicKey();
    const isValid = await blsService.verify(testMessage, signature, publicKey);
    expect(isValid).toBe(true);
  });

  test('使用错误的消息应该验证失败', async () => {
    const signature = await blsService.sign(testMessage);
    const publicKey = blsService.getPublicKey();
    const isValid = await blsService.verify('Wrong message', signature, publicKey);
    expect(isValid).toBe(false);
  });

  test('应该能够聚合签名并验证', async () => {
    // 创建两个签名
    const signature1 = await blsService.sign(testMessage);
    const signature2 = await blsService.sign(testMessage);
    
    // 聚合签名
    const aggregatedSignature = await blsService.aggregateSignatures([signature1, signature2]);
    expect(aggregatedSignature).toBeDefined();
    expect(typeof aggregatedSignature).toBe('string');
    expect(aggregatedSignature.length).toBeGreaterThan(0);
    
    // 验证聚合签名
    const publicKey = blsService.getPublicKey();
    const isValid = await blsService.verifyAggregatedSignature(
      testMessage,
      aggregatedSignature,
      [publicKey, publicKey] // 使用相同的公钥，因为我们没有多个BLS实例
    );
    expect(isValid).toBe(true);
  });
}); 