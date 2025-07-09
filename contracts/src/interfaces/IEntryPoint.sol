// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./UserOperation.sol";

/**
 * @title IEntryPoint
 * @dev ERC-4337 EntryPoint接口
 */
interface IEntryPoint {
    // 每个聚合器的用户操作结构
    struct UserOpsPerAggregator {
        UserOperation[] userOps;
        address aggregator;
        bytes signature;
    }

    // 返回信息结构
    struct ReturnInfo {
        uint256 preOpGas;
        uint256 prefund;
        bool sigFailed;
        uint48 validAfter;
        uint48 validUntil;
        bytes paymasterContext;
    }

    // 质押信息结构
    struct StakeInfo {
        uint256 stake;
        uint256 unstakeDelaySec;
    }

    // 聚合器质押信息结构
    struct AggregatorStakeInfo {
        address aggregator;
        StakeInfo stakeInfo;
    }

    // 事件
    event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost, uint256 actualGasUsed);
    event AccountDeployed(bytes32 indexed userOpHash, address indexed sender, address factory, address paymaster);
    event Deposited(address indexed account, uint256 totalDeposit);
    event Withdrawn(address indexed account, address withdrawAddress, uint256 amount);
    event StakeLocked(address indexed account, uint256 totalStaked, uint256 unstakeDelaySec);
    event StakeUnlocked(address indexed account, uint256 withdrawTime);
    event StakeWithdrawn(address indexed account, address withdrawAddress, uint256 amount);

    // 错误
    error FailedOp(uint256 opIndex, string reason);
    error SenderAddressResult(address sender);
    error SignatureValidationFailed(address aggregator);
    error ValidationResult(ReturnInfo returnInfo, StakeInfo senderInfo, StakeInfo factoryInfo, StakeInfo paymasterInfo);
    error ValidationResultWithAggregation(ReturnInfo returnInfo, StakeInfo senderInfo, StakeInfo factoryInfo, StakeInfo paymasterInfo, AggregatorStakeInfo aggregatorInfo);

    // 主要方法
    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external;
    function handleAggregatedOps(UserOpsPerAggregator[] calldata opsPerAggregator, address payable beneficiary) external;
    function simulateValidation(UserOperation calldata userOp) external;
    function getSenderAddress(bytes calldata initCode) external;
    function getUserOpHash(UserOperation calldata userOp) external view returns (bytes32);
    
    // 存款和质押方法
    function depositTo(address account) external payable;
    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external;
    function addStake(uint32 unstakeDelaySec) external payable;
    function unlockStake() external;
    function withdrawStake(address payable withdrawAddress) external;
    function balanceOf(address account) external view returns (uint256);
    function getStakeInfo(address account) external view returns (StakeInfo memory);
} 