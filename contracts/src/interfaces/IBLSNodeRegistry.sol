// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IBLSNodeRegistry {
    function registerNode(
        string calldata nodeId,
        bytes calldata publicKey,
        string calldata url
    ) external;

    function deactivateNode(string calldata nodeId) external;
    
    function activateNode(string calldata nodeId) external;
    
    function updateNodeUrl(string calldata nodeId, string calldata newUrl) external;
    
    function getNode(string calldata nodeId) external view returns (
        bytes memory publicKey,
        string memory url,
        bool isActive,
        uint256 registeredAt
    );
    
    function getActiveNodes() external view returns (
        string[] memory activeNodeIds,
        bytes[] memory publicKeys,
        string[] memory urls
    );
    
    function isActiveNode(string calldata nodeId) external view returns (bool);
    
    function getNodeCount() external view returns (uint256);
} 