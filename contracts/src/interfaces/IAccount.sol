// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./UserOperation.sol";

/**
 * @title IAccount
 * @dev 账户合约必须实现的接口
 */
interface IAccount {
    /**
     * @dev 验证用户操作
     * @param userOp 用户操作数据
     * @param userOpHash 用户操作哈希
     * @param missingAccountFunds 缺少的账户资金
     * @return validationData 验证结果数据
     */
    function validateUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 missingAccountFunds
    ) external returns (uint256 validationData);
} 