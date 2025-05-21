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
    bytes32 public blsPublicKey;
    
    event AccountInitialized(address indexed owner, bytes32 indexed blsPublicKey);
    event AccountCreated(address indexed account, address indexed owner, bytes32 indexed blsPublicKey);
    
    error NotEntryPoint();
    
    function setUp() public {
        owner = makeAddr("owner");
        blsPublicKey = bytes32(uint256(1));
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
    }
    
    function test_ExecuteTransaction() public {
        // 创建账户
        bytes32 salt = bytes32(0);
        address accountAddress = factory.createAccount(owner, blsPublicKey, salt);
        AAAccount account = AAAccount(payable(accountAddress));
        
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
        
        UserOperation memory userOp;
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
} 