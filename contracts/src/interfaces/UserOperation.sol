// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title UserOperation
 * @dev 用户操作的数据结构
 */
struct UserOperation {
    address sender;
    uint256 nonce;
    bytes initCode;
    bytes callData;
    uint256 callGasLimit;
    uint256 verificationGasLimit;
    uint256 preVerificationGas;
    uint256 maxFeePerGas;
    uint256 maxPriorityFeePerGas;
    bytes paymasterAndData;
    bytes signature;
} 