// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/AAAccount.sol";
import "../src/AAAccountFactory.sol";
import "./mocks/MockEntryPoint.sol";

contract AAAccountTest is Test {
    AAAccount public implementation;
    AAAccountFactory public factory;
    MockEntryPoint public entryPoint;
    address public owner;
    bytes public blsPublicKey;
    
    event AccountInitialized(address indexed owner, bytes blsPublicKey);
    event AccountCreated(address indexed account, address indexed owner, bytes blsPublicKey);
    
    error NotEntryPoint();
    error NotOwner();
    error InvalidSignature();
    error InvalidSignatureLength();
    
    function setUp() public {
        owner = makeAddr("owner");
        // 模拟48字节的BLS公钥
        blsPublicKey = new bytes(48);
        for (uint i = 0; i < 48; i++) {
            blsPublicKey[i] = bytes1(uint8(i));
        }
        
        entryPoint = new MockEntryPoint();
        
        // 部署合约
        implementation = new AAAccount(IEntryPoint(address(entryPoint)));
        factory = new AAAccountFactory(IEntryPoint(address(entryPoint)));
    }
    
    function test_CreateAccount() public {
        bytes32 salt = bytes32(0);
        address expectedAddress = factory.getAddress(owner, blsPublicKey, salt);
        
        vm.expectEmit(true, true, true, true);
        emit AccountCreated(expectedAddress, owner, blsPublicKey);
        
        address accountAddress = factory.createAccount(owner, blsPublicKey, salt);
        assertEq(accountAddress, expectedAddress, "Account address mismatch");
        
        AAAccount account = AAAccount(payable(accountAddress));
        assertEq(account.owner(), owner, "Owner mismatch");
        assertEq(account.blsPublicKey(), blsPublicKey, "BLS public key mismatch");
        
        // 确保创建的账户处于测试模式
        assertTrue(account.isTesting(), "Account should be in testing mode");
    }
    
    function test_ExecuteTransaction() public {
        // 创建账户
        bytes32 salt = bytes32(0);
        address accountAddress = factory.createAccount(owner, blsPublicKey, salt);
        AAAccount account = AAAccount(payable(accountAddress));
        
        // 确保处于测试模式
        assertTrue(account.isTesting(), "Account should be in testing mode");
        
        // 准备测试交易
        address target = makeAddr("target");
        uint256 value = 1 ether;
        bytes memory data = "";
        
        // 发送一些 ETH 到账户
        vm.deal(accountAddress, 2 ether);
        
        // 模拟 EntryPoint 调用
        vm.prank(address(entryPoint));
        account.execute(target, value, data);
        
        assertEq(target.balance, value, "Transfer failed");
    }
    
    function test_RevertWhen_NotEntryPoint() public {
        bytes32 salt = bytes32(0);
        address accountAddress = factory.createAccount(owner, blsPublicKey, salt);
        AAAccount account = AAAccount(payable(accountAddress));
        
        address target = makeAddr("target");
        uint256 value = 1 ether;
        bytes memory data = "";
        
        vm.expectRevert(abi.encodeWithSelector(NotEntryPoint.selector));
        account.execute(target, value, data);
    }
    
    function test_ValidateUserOp() public {
        bytes32 salt = bytes32(0);
        address accountAddress = factory.createAccount(owner, blsPublicKey, salt);
        AAAccount account = AAAccount(payable(accountAddress));
        
        // 确保处于测试模式
        assertTrue(account.isTesting(), "Account should be in testing mode");
        
        // 创建有效的签名（128字节）
        bytes memory validSignature = new bytes(128);
        for (uint i = 0; i < 128; i++) {
            validSignature[i] = bytes1(uint8(i));
        }
        
        UserOperation memory userOp;
        userOp.signature = validSignature;
        bytes32 userOpHash = bytes32(uint256(2));
        uint256 missingAccountFunds = 0.1 ether;
        
        // 发送一些 ETH 到账户
        vm.deal(accountAddress, 1 ether);
        
        // 模拟 EntryPoint 调用
        vm.prank(address(entryPoint));
        uint256 validationData = account.validateUserOp(userOp, userOpHash, missingAccountFunds);
        
        assertEq(validationData, 0, "Validation should succeed");
        assertEq(address(entryPoint).balance, missingAccountFunds, "Missing funds not transferred");
    }
    
    function test_ValidateAggregatedSignature() public {
        bytes32 salt = bytes32(0);
        address accountAddress = factory.createAccount(owner, blsPublicKey, salt);
        AAAccount account = AAAccount(payable(accountAddress));
        
        // 确保处于测试模式
        assertTrue(account.isTesting(), "Account should be in testing mode");
        
        bytes32 messageHash = bytes32(uint256(3));
        bytes memory aggregatedSignature = new bytes(128);
        bytes[] memory publicKeys = new bytes[](2);
        publicKeys[0] = blsPublicKey;
        publicKeys[1] = blsPublicKey;
        
        bool isValid = account.validateAggregatedSignature(
            messageHash,
            aggregatedSignature,
            publicKeys
        );
        
        assertTrue(isValid, "Aggregated signature validation failed");
    }
    
    function test_RevertWhen_InvalidSignatureLength() public {
        bytes32 salt = bytes32(0);
        
        // 创建无效长度的BLS公钥
        bytes memory invalidBlsPublicKey = new bytes(32);
        
        vm.expectRevert(InvalidSignatureLength.selector);
        factory.createAccount(owner, invalidBlsPublicKey, salt);
    }
    
    function test_TestingModeToggle() public {
        bytes32 salt = bytes32(0);
        address accountAddress = factory.createAccount(owner, blsPublicKey, salt);
        AAAccount account = AAAccount(payable(accountAddress));
        
        // 确认初始状态为测试模式
        assertTrue(account.isTesting(), "Account should start in testing mode");
        
        // 不是所有者时应该失败
        vm.expectRevert(abi.encodeWithSelector(NotOwner.selector));
        account.setTestingMode(false);
        
        // 以所有者身份切换测试模式
        vm.prank(owner);
        account.setTestingMode(false);
        
        // 确认测试模式已关闭
        assertFalse(account.isTesting(), "Testing mode should be turned off");
        
        // 再次开启测试模式
        vm.prank(owner);
        account.setTestingMode(true);
        
        // 确认测试模式已开启
        assertTrue(account.isTesting(), "Testing mode should be turned back on");
    }
} 