// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/BLSNodeRegistry.sol";

contract BLSNodeRegistryTest is Test {
    BLSNodeRegistry public registry;
    
    // 测试数据
    string constant NODE_ID = "test-node-1";
    bytes constant PUBLIC_KEY = hex"000102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f202122232425262728292a2b2c2d2e2f";
    string constant URL = "http://localhost:3001";
    
    // 事件
    event NodeRegistered(string indexed nodeId, bytes publicKey, string url);
    event NodeDeactivated(string indexed nodeId);
    event NodeActivated(string indexed nodeId);
    event NodeUpdated(string indexed nodeId, string url);

    function setUp() public {
        // 部署合约
        registry = new BLSNodeRegistry();
    }

    function testRegisterNode() public {
        // 期望触发 NodeRegistered 事件
        vm.expectEmit(true, false, false, true);
        emit NodeRegistered(NODE_ID, PUBLIC_KEY, URL);

        // 注册节点
        registry.registerNode(NODE_ID, PUBLIC_KEY, URL);

        // 验证节点信息
        (bytes memory publicKey, string memory url, bool isActive, uint256 registeredAt) = registry.getNode(NODE_ID);
        
        assertEq(publicKey, PUBLIC_KEY, "Public key mismatch");
        assertEq(url, URL, "URL mismatch");
        assertTrue(isActive, "Node should be active");
        assertGt(registeredAt, 0, "Registration time should be set");
    }

    function testRegisterNodeWithInvalidPublicKey() public {
        bytes memory invalidPublicKey = hex"0001"; // 长度不是48字节
        
        // 期望交易回滚，错误信息为 InvalidPublicKeyLength
        vm.expectRevert(BLSNodeRegistry.InvalidPublicKeyLength.selector);
        registry.registerNode(NODE_ID, invalidPublicKey, URL);
    }

    function testRegisterDuplicateNode() public {
        // 首次注册
        registry.registerNode(NODE_ID, PUBLIC_KEY, URL);
        
        // 期望交易回滚，错误信息为 NodeAlreadyRegistered
        vm.expectRevert(BLSNodeRegistry.NodeAlreadyRegistered.selector);
        registry.registerNode(NODE_ID, PUBLIC_KEY, URL);
    }

    function testDeactivateNode() public {
        // 先注册节点
        registry.registerNode(NODE_ID, PUBLIC_KEY, URL);
        
        // 期望触发 NodeDeactivated 事件
        vm.expectEmit(true, false, false, true);
        emit NodeDeactivated(NODE_ID);

        // 停用节点
        registry.deactivateNode(NODE_ID);

        // 验证节点状态
        (,, bool isActive,) = registry.getNode(NODE_ID);
        assertFalse(isActive, "Node should be inactive");
    }

    function testActivateNode() public {
        // 先注册并停用节点
        registry.registerNode(NODE_ID, PUBLIC_KEY, URL);
        registry.deactivateNode(NODE_ID);
        
        // 期望触发 NodeActivated 事件
        vm.expectEmit(true, false, false, true);
        emit NodeActivated(NODE_ID);

        // 激活节点
        registry.activateNode(NODE_ID);

        // 验证节点状态
        (,, bool isActive,) = registry.getNode(NODE_ID);
        assertTrue(isActive, "Node should be active");
    }

    function testUpdateNodeUrl() public {
        // 先注册节点
        registry.registerNode(NODE_ID, PUBLIC_KEY, URL);
        
        string memory newUrl = "http://localhost:3002";
        
        // 期望触发 NodeUpdated 事件
        vm.expectEmit(true, false, false, true);
        emit NodeUpdated(NODE_ID, newUrl);

        // 更新URL
        registry.updateNodeUrl(NODE_ID, newUrl);

        // 验证节点URL
        (, string memory updatedUrl,,) = registry.getNode(NODE_ID);
        assertEq(updatedUrl, newUrl, "URL should be updated");
    }

    function testGetActiveNodes() public {
        // 注册多个节点
        registry.registerNode("node1", PUBLIC_KEY, "http://localhost:3001");
        registry.registerNode("node2", PUBLIC_KEY, "http://localhost:3002");
        registry.registerNode("node3", PUBLIC_KEY, "http://localhost:3003");
        
        // 停用一个节点
        registry.deactivateNode("node2");

        // 获取活跃节点列表
        (
            string[] memory activeNodeIds,
            bytes[] memory publicKeys,
            string[] memory urls
        ) = registry.getActiveNodes();

        // 验证活跃节点数量
        assertEq(activeNodeIds.length, 2, "Should have 2 active nodes");
        assertEq(publicKeys.length, 2, "Should have 2 public keys");
        assertEq(urls.length, 2, "Should have 2 URLs");

        // 验证第一个活跃节点
        assertEq(activeNodeIds[0], "node1", "First active node ID mismatch");
        assertEq(publicKeys[0], PUBLIC_KEY, "First public key mismatch");
        assertEq(urls[0], "http://localhost:3001", "First URL mismatch");

        // 验证第二个活跃节点
        assertEq(activeNodeIds[1], "node3", "Second active node ID mismatch");
        assertEq(publicKeys[1], PUBLIC_KEY, "Second public key mismatch");
        assertEq(urls[1], "http://localhost:3003", "Second URL mismatch");
    }

    function testNodeCount() public {
        // 初始节点数应该为0
        assertEq(registry.getNodeCount(), 0, "Initial node count should be 0");

        // 注册节点
        registry.registerNode("node1", PUBLIC_KEY, URL);
        assertEq(registry.getNodeCount(), 1, "Node count should be 1");

        registry.registerNode("node2", PUBLIC_KEY, URL);
        assertEq(registry.getNodeCount(), 2, "Node count should be 2");

        // 停用节点不应影响总数
        registry.deactivateNode("node1");
        assertEq(registry.getNodeCount(), 2, "Node count should still be 2");
    }
} 