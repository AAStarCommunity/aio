import { ethers } from 'ethers';
import config from '../config/config';

async function main() {
    // 连接到本地anvil链
    const provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
    
    // 核心合约地址
    const contracts = {
        entryPoint: config.ethereum.entryPointAddress,
        accountFactory: config.ethereum.accountFactoryAddress,
        paymaster: config.ethereum.paymasterAddress
    };

    console.log('检查核心合约状态...\n');

    for (const [name, address] of Object.entries(contracts)) {
        console.log(`${name}:`, address);
        
        // 检查合约代码
        const code = await provider.getCode(address);
        console.log('是否是合约:', code !== '0x');
        console.log('合约代码长度:', (code.length - 2) / 2, '字节');
        
        // 检查余额
        const balance = await provider.getBalance(address);
        console.log('余额:', ethers.formatEther(balance), 'ETH');
        
        console.log('-------------------\n');
    }
}

main().catch(console.error); 