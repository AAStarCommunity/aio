// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "../../src/interfaces/IEntryPoint.sol";

contract MockEntryPoint is IEntryPoint {
    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external {
        // Mock implementation
    }

    function simulateValidation(UserOperation calldata userOp) external {
        // Mock implementation
    }

    function getUserOpHash(UserOperation calldata userOp, uint48 validUntil, uint48 validAfter) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(userOp.sender, validUntil, validAfter));
    }

    receive() external payable {}
} 