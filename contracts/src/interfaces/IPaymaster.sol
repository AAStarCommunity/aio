// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./UserOperation.sol";

/**
 * @title IPaymaster
 * @dev Paymaster合约必须实现的接口
 */
interface IPaymaster {
    enum PostOpMode {
        opSucceeded,
        opReverted,
        postOpReverted
    }

    /**
     * @dev 验证用户操作并处理支付
     * @param userOp 用户操作
     * @param userOpHash 用户操作哈希
     * @param maxCost 最大成本
     * @return context 上下文数据，用于 postOp
     */
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external returns (bytes memory context);

    /**
     * @dev 操作后的处理
     * @param mode 操作模式
     * @param context validatePaymasterUserOp 返回的上下文
     * @param actualGasCost 实际 gas 成本
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external;
} 