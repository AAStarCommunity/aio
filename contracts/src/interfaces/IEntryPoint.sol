// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./UserOperation.sol";

/**
 * @title IEntryPoint
 * @dev ERC-4337 EntryPoint 合约接口
 */
interface IEntryPoint {
    /**
     * @dev 批量处理用户操作
     * @param ops 用户操作数组
     * @return success 每个操作的执行结果
     */
    function handleOps(UserOperation[] calldata ops) external returns (bool[] memory success);

    /**
     * @dev 存款
     */
    function deposit() external payable;

    /**
     * @dev 提取存款
     * @param amount 提取金额
     */
    function withdraw(uint256 amount) external;

    /**
     * @dev 获取账户存款信息
     * @param account 账户地址
     * @return amount 存款金额
     * @return unlockTime 解锁时间
     */
    function getDeposit(address account) external view returns (uint256 amount, uint256 unlockTime);

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