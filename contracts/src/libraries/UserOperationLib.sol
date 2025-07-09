// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../interfaces/UserOperation.sol";

/**
 * @title UserOperationLib
 * @dev 用户操作辅助库，提供哈希计算等功能
 */
library UserOperationLib {
    /**
     * @dev 计算用户操作的哈希值
     * @param userOp 用户操作
     * @return 用户操作哈希
     */
    function hash(UserOperation calldata userOp) internal pure returns (bytes32) {
        return keccak256(abi.encode(
            userOp.sender,
            userOp.nonce,
            keccak256(userOp.initCode),
            keccak256(userOp.callData),
            userOp.callGasLimit,
            userOp.verificationGasLimit,
            userOp.preVerificationGas,
            userOp.maxFeePerGas,
            userOp.maxPriorityFeePerGas,
            keccak256(userOp.paymasterAndData)
        ));
    }

    /**
     * @dev 获取 paymaster 地址
     * @param userOp 用户操作
     * @return paymaster 地址
     */
    function getPaymaster(UserOperation calldata userOp) internal pure returns (address) {
        bytes calldata paymasterAndData = userOp.paymasterAndData;
        if (paymasterAndData.length < 20) {
            return address(0);
        }
        return address(bytes20(paymasterAndData[:20]));
    }

    /**
     * @dev 计算所需的预付资金
     * @param userOp 用户操作
     * @param gasPrice gas 价格
     * @return 所需资金
     */
    function requiredPreFund(UserOperation calldata userOp, uint256 gasPrice) internal pure returns (uint256) {
        return gasPrice * (userOp.callGasLimit + userOp.verificationGasLimit + userOp.preVerificationGas);
    }

    /**
     * @dev 获取初始化代码工厂地址
     * @param userOp 用户操作
     * @return 工厂地址
     */
    function getInitCodeFactory(UserOperation calldata userOp) internal pure returns (address) {
        bytes calldata initCode = userOp.initCode;
        if (initCode.length < 20) {
            return address(0);
        }
        return address(bytes20(initCode[:20]));
    }
} 