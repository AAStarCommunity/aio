import { ethers } from 'ethers';
import config from '../config/config';

async function main() {
    // 连接到 Sepolia 测试网
    const provider = new ethers.JsonRpcProvider(config().ethereum.rpcUrl);
    
    // 要检查的钱包地址
    const walletAddresses = [
        '0x5b2bb17530fb16b6d471be8ed490112973ec454b',
        '0x50c984cca85937108cfb30fde72d3cc2f0c8a80f'
    ];

    console.log('检查钱包状态...\n');

    for (const address of walletAddresses) {
        console.log(`钱包地址: ${address}`);
        
        // 检查合约代码
        const code = await provider.getCode(address);
        console.log('是否是合约:', code !== '0x');
        
        // 检查余额
        const balance = await provider.getBalance(address);
        console.log('余额:', ethers.formatEther(balance), 'ETH');
        
        // 获取合约创建的区块号
        const txCount = await provider.getTransactionCount(address);
        console.log('交易数量:', txCount);
        
        console.log('-------------------\n');
    }
}

main().catch(console.error); 