// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../src/interfaces/IEntryPoint.sol";

contract MockEntryPoint is IEntryPoint {
    struct DepositInfo {
        uint256 amount;
        uint256 unlockTime;
    }

    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);
    event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost);

    mapping(address => DepositInfo) public deposits;

    function handleOps(UserOperation[] calldata ops) external returns (bool[] memory success) {
        // Mock implementation
        success = new bool[](ops.length);
        for (uint256 i = 0; i < ops.length; i++) {
            success[i] = _handleOp(ops[i]);
        }
    }

    function handleOp(UserOperation calldata userOp) external returns (bool success) {
        // Mock implementation
        return _handleOp(userOp);
    }

    function _handleOp(UserOperation calldata userOp) internal returns (bool) {
        // Mock implementation
        return true;
    }

    function simulateValidation(UserOperation calldata userOp) external {
        // Mock implementation
    }

    function getUserOpHash(UserOperation calldata userOp, uint48 validUntil, uint48 validAfter) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(userOp.sender, validUntil, validAfter));
    }

    function deposit() external payable {
        deposits[msg.sender].amount += msg.value;
        deposits[msg.sender].unlockTime = block.timestamp + 2 days;
        emit Deposited(msg.sender, msg.value);
    }

    function getDeposit(address account) external view returns (uint256 amount, uint256 unlockTime) {
        DepositInfo memory info = deposits[account];
        return (info.amount, info.unlockTime);
    }

    function withdraw(uint256 amount) external {
        DepositInfo storage info = deposits[msg.sender];
        require(info.unlockTime <= block.timestamp, "Deposit still locked");
        require(info.amount >= amount, "Insufficient deposit");
        
        info.amount -= amount;
        (bool success,) = msg.sender.call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }

    function getSenderAddress(bytes calldata initCode) external view returns (address) {
        // Mock implementation - 返回从initCode中提取的地址
        if (initCode.length >= 20) {
            return address(uint160(uint256(bytes32(initCode[:20]))));
        }
        return address(0);
    }

    receive() external payable {}
} 