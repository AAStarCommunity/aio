// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./UserOperation.sol";

/**
 * @title IPaymaster
 * @dev Paymaster合约必须实现的接口
 */
interface IPaymaster {
    /**
     * @dev 验证用户操作并决定是否支付gas费用
     * @param userOp 用户操作
     * @param userOpHash 用户操作哈希
     * @param requiredPreFund 预先需要的资金
     * @return context 上下文数据，将传递给postOp
     * @return validationData 验证结果数据
     */
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 requiredPreFund
    ) external returns (bytes memory context, uint256 validationData);

    /**
     * @dev 在用户操作执行后进行处理
     * @param mode 处理模式 (0=成功, 1=还原)
     * @param context validatePaymasterUserOp返回的上下文
     * @param actualGasCost 实际gas成本
     */
    function postOp(
        uint8 mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external;
} 