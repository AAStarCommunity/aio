// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./UserOperation.sol";

/**
 * @title IEntryPoint
 * @dev ERC-4337 EntryPoint 合约接口
 */
interface IEntryPoint {
    /**
     * @dev 处理用户操作
     * @param ops 用户操作数组
     * @param beneficiary 受益人地址（获取退款）
     */
    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external;

    /**
     * @dev 模拟验证用户操作
     * @param userOp 用户操作
     */
    function simulateValidation(UserOperation calldata userOp) external;

    /**
     * @dev 获取用户操作哈希
     * @param userOp 用户操作
     * @param validUntil 有效期限
     * @param validAfter 生效时间
     */
    function getUserOpHash(UserOperation calldata userOp, uint48 validUntil, uint48 validAfter) external view returns (bytes32);
} 