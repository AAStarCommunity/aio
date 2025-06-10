// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IAAAccountFactory {
    function getAddress(
        address owner,
        bytes memory blsPublicKey,
        bytes32 salt
    ) external view returns (address);
    
    function createAccount(
        address owner,
        bytes memory blsPublicKey,
        bytes32 salt
    ) external returns (address);
} 