// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title UserOperation
 * @dev 用户操作结构体，定义了账户抽象交易的格式
 */
struct UserOperation {
    address sender;              // 发送者地址（账户合约）
    uint256 nonce;              // 账户 nonce
    bytes initCode;             // 账户初始化代码
    bytes callData;             // 调用数据
    uint256 callGasLimit;       // 调用 gas 限制
    uint256 verificationGasLimit; // 验证 gas 限制
    uint256 preVerificationGas;   // 预验证 gas
    uint256 maxFeePerGas;        // 最大 gas 价格
    uint256 maxPriorityFeePerGas; // 最大优先 gas 价格
    bytes paymasterAndData;       // paymaster 地址和数据
    bytes signature;              // 签名数据
    address target;               // 目标合约地址
    uint256 value;               // 发送的 ETH 数量
    bytes data;                  // 调用数据
} 