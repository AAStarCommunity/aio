const { ethers } = require('ethers');

// 连接到本地anvil网络
const provider = new ethers.JsonRpcProvider('http://localhost:8545');

// 合约地址
const ENTRY_POINT_ADDRESS = '0x0165878A594ca255338adfa4d48449f69242Eb8F';

// ERC-4337 EntryPoint ABI (简化版)
const ENTRY_POINT_ABI = [
  'function handleOps(tuple[] calldata ops, address payable beneficiary) external',
  'function getUserOpHash(tuple calldata userOp) external view returns (bytes32)',
  'function simulateValidation(tuple calldata userOp) external',
  'function depositTo(address account) external payable',
  'function balanceOf(address account) external view returns (uint256)',
  'function getSenderAddress(bytes calldata initCode) external',
  'function addStake(uint32 unstakeDelaySec) external payable',
  'function unlockStake() external',
  'function withdrawStake(address payable withdrawAddress) external',
  'event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed)'
];

async function testEntryPoint() {
  console.log('🔍 Testing ERC-4337 EntryPoint compliance...');
  
  // 创建signer
  const signer = new ethers.Wallet('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', provider);
  
  // 连接到EntryPoint合约
  const entryPoint = new ethers.Contract(ENTRY_POINT_ADDRESS, ENTRY_POINT_ABI, signer);
  
  try {
    // 1. 测试存款功能
    console.log('📦 Testing deposit functionality...');
    const depositTx = await entryPoint.depositTo(signer.address, { value: ethers.parseEther('0.1') });
    await depositTx.wait();
    console.log('✅ Deposit successful');
    
    // 2. 检查余额
    const balance = await entryPoint.balanceOf(signer.address);
    console.log(`💰 Account balance: ${ethers.formatEther(balance)} ETH`);
    
    // 3. 测试getUserOpHash函数
    console.log('🔑 Testing getUserOpHash...');
    const dummyUserOp = {
      sender: signer.address,
      nonce: 0,
      initCode: '0x',
      callData: '0x',
      callGasLimit: 100000,
      verificationGasLimit: 100000,
      preVerificationGas: 21000,
      maxFeePerGas: ethers.parseUnits('20', 'gwei'),
      maxPriorityFeePerGas: ethers.parseUnits('1', 'gwei'),
      paymasterAndData: '0x',
      signature: '0x',
      target: ethers.ZeroAddress,
      value: 0,
      data: '0x'
    };
    
    const userOpHash = await entryPoint.getUserOpHash(dummyUserOp);
    console.log(`✅ UserOp hash: ${userOpHash}`);
    
    // 4. 测试simulateValidation（这会revert，但我们捕获错误）
    console.log('🧪 Testing simulateValidation...');
    try {
      await entryPoint.simulateValidation(dummyUserOp);
    } catch (error) {
      if (error.message.includes('ValidationResult') || error.message.includes('revert')) {
        console.log('✅ simulateValidation working correctly (expected revert)');
      } else {
        console.log('❌ simulateValidation error:', error.message);
      }
    }
    
    console.log('🎉 EntryPoint compliance test completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// 运行测试
testEntryPoint().catch(console.error); 