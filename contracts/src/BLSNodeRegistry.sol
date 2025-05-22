// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BLSNodeRegistry
 * @dev BLS节点注册合约，用于管理BLS节点的注册和状态
 */
contract BLSNodeRegistry is Ownable {
    struct Node {
        bytes publicKey;      // BLS公钥
        string url;          // 节点URL
        bool isActive;       // 节点是否活跃
        uint256 registeredAt; // 注册时间
    }

    // 节点映射：nodeId => Node
    mapping(string => Node) public nodes;
    
    // 所有已注册的节点ID列表
    string[] public nodeIds;
    
    // 事件
    event NodeRegistered(string indexed nodeId, bytes publicKey, string url);
    event NodeDeactivated(string indexed nodeId);
    event NodeActivated(string indexed nodeId);
    event NodeUpdated(string indexed nodeId, string url);

    // 错误
    error NodeAlreadyRegistered();
    error NodeNotRegistered();
    error InvalidPublicKeyLength();
    error EmptyNodeId();
    error EmptyUrl();

    // 构造函数
    constructor(address initialOwner) Ownable(initialOwner) {}

    /**
     * @dev 注册新节点
     * @param nodeId 节点ID
     * @param publicKey BLS公钥
     * @param url 节点URL
     */
    function registerNode(
        string calldata nodeId,
        bytes calldata publicKey,
        string calldata url
    ) external onlyOwner {
        // 验证输入
        if (bytes(nodeId).length == 0) revert EmptyNodeId();
        if (bytes(url).length == 0) revert EmptyUrl();
        if (publicKey.length != 48) revert InvalidPublicKeyLength();
        if (nodes[nodeId].registeredAt != 0) revert NodeAlreadyRegistered();

        // 注册节点
        nodes[nodeId] = Node({
            publicKey: publicKey,
            url: url,
            isActive: true,
            registeredAt: block.timestamp
        });

        // 添加到节点列表
        nodeIds.push(nodeId);

        emit NodeRegistered(nodeId, publicKey, url);
    }

    /**
     * @dev 停用节点
     * @param nodeId 节点ID
     */
    function deactivateNode(string calldata nodeId) external onlyOwner {
        if (nodes[nodeId].registeredAt == 0) revert NodeNotRegistered();
        
        nodes[nodeId].isActive = false;
        emit NodeDeactivated(nodeId);
    }

    /**
     * @dev 激活节点
     * @param nodeId 节点ID
     */
    function activateNode(string calldata nodeId) external onlyOwner {
        if (nodes[nodeId].registeredAt == 0) revert NodeNotRegistered();
        
        nodes[nodeId].isActive = true;
        emit NodeActivated(nodeId);
    }

    /**
     * @dev 更新节点URL
     * @param nodeId 节点ID
     * @param newUrl 新的URL
     */
    function updateNodeUrl(string calldata nodeId, string calldata newUrl) external onlyOwner {
        if (nodes[nodeId].registeredAt == 0) revert NodeNotRegistered();
        if (bytes(newUrl).length == 0) revert EmptyUrl();
        
        nodes[nodeId].url = newUrl;
        emit NodeUpdated(nodeId, newUrl);
    }

    /**
     * @dev 获取节点信息
     * @param nodeId 节点ID
     */
    function getNode(string calldata nodeId) external view returns (
        bytes memory publicKey,
        string memory url,
        bool isActive,
        uint256 registeredAt
    ) {
        Node memory node = nodes[nodeId];
        return (node.publicKey, node.url, node.isActive, node.registeredAt);
    }

    /**
     * @dev 获取所有活跃节点
     */
    function getActiveNodes() external view returns (
        string[] memory activeNodeIds,
        bytes[] memory publicKeys,
        string[] memory urls
    ) {
        uint256 activeCount = 0;
        
        // 计算活跃节点数量
        for (uint256 i = 0; i < nodeIds.length; i++) {
            if (nodes[nodeIds[i]].isActive) {
                activeCount++;
            }
        }

        // 初始化返回数组
        activeNodeIds = new string[](activeCount);
        publicKeys = new bytes[](activeCount);
        urls = new string[](activeCount);

        // 填充活跃节点信息
        uint256 index = 0;
        for (uint256 i = 0; i < nodeIds.length; i++) {
            string memory nodeId = nodeIds[i];
            Node memory node = nodes[nodeId];
            
            if (node.isActive) {
                activeNodeIds[index] = nodeId;
                publicKeys[index] = node.publicKey;
                urls[index] = node.url;
                index++;
            }
        }

        return (activeNodeIds, publicKeys, urls);
    }

    /**
     * @dev 检查节点是否已注册且活跃
     * @param nodeId 节点ID
     */
    function isActiveNode(string calldata nodeId) external view returns (bool) {
        return nodes[nodeId].isActive;
    }

    /**
     * @dev 获取已注册节点总数
     */
    function getNodeCount() external view returns (uint256) {
        return nodeIds.length;
    }
} 