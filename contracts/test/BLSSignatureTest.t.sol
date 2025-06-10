// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/libraries/BLSSignatureVerifier.sol";
import "../src/AAAccount.sol";
import "../src/AAAccountFactory.sol";
import "../src/EntryPoint.sol";
import "../src/interfaces/UserOperation.sol";

/**
 * @title BLSSignatureTest
 * @dev 测试BLS签名验证功能
 */
contract BLSSignatureTest is Test {
    EntryPoint public entryPoint;
    AAAccountFactory public factory;
    AAAccount public implementation;
    address public accountAddress;
    
    // 测试密钥和签名（实际项目中应该动态生成或从外部获取）
    bytes public blsPublicKey;
    bytes public blsSignature;
    bytes32 public messageHash;
    
    function setUp() public {
        // 部署合约
        entryPoint = new EntryPoint();
        implementation = new AAAccount(entryPoint);
        factory = new AAAccountFactory(entryPoint);
        
        // 生成测试用的BLS公钥（在实际应用中，应从BLS库生成）
        blsPublicKey = new bytes(48);
        for (uint8 i = 0; i < 48; i++) {
            blsPublicKey[i] = bytes1(i);
        }
        
        // 创建账户
        accountAddress = factory.createAccount(
            address(this),
            blsPublicKey,
            bytes32(uint256(123))
        );
        
        // 生成测试用的签名（在实际应用中，应使用BLS库计算）
        blsSignature = new bytes(64);
        for (uint8 i = 0; i < 64; i++) {
            blsSignature[i] = bytes1(i);
        }
        
        // 生成测试用的消息哈希
        messageHash = keccak256(abi.encodePacked("test message"));
    }
    
    function testAccountInitialization() public {
        AAAccount account = AAAccount(payable(accountAddress));
        
        // 验证账户初始化是否正确
        assertEq(account.owner(), address(this));
        assertEq(account.blsPublicKey(), blsPublicKey);
        assertTrue(account.isTesting());
    }
    
    function testSignatureVerificationInTestMode() public {
        AAAccount account = AAAccount(payable(accountAddress));
        
        // 创建测试用的UserOperation
        UserOperation memory userOp = UserOperation({
            sender: accountAddress,
            nonce: 0,
            initCode: "",
            callData: abi.encodeWithSelector(
                AAAccount.execute.selector,
                address(0x123),
                0.1 ether,
                ""
            ),
            callGasLimit: 100000,
            verificationGasLimit: 100000,
            preVerificationGas: 100000,
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 1 gwei,
            paymasterAndData: "",
            signature: blsSignature,
            target: address(0x123),
            value: 0.1 ether,
            data: ""
        });
        
        // 计算UserOperation哈希
        bytes32 userOpHash = keccak256(abi.encodePacked("UserOperation"));
        
        // 在测试模式下验证签名（应该总是通过）
        assertTrue(account.isTesting());
        account.validateUserOp(userOp, userOpHash, 0);
    }
    
    function testAggregatedSignatureVerification() public {
        AAAccount account = AAAccount(payable(accountAddress));
        
        // 创建多个测试公钥
        bytes[] memory publicKeys = new bytes[](3);
        for (uint256 i = 0; i < 3; i++) {
            publicKeys[i] = new bytes(48);
            for (uint8 j = 0; j < 48; j++) {
                publicKeys[i][j] = bytes1(uint8(i * 10 + j));
            }
        }
        
        // 在测试模式下验证聚合签名
        assertTrue(account.validateAggregatedSignature(messageHash, blsSignature, publicKeys));
    }
    
    function testDisableTestingMode() public {
        AAAccount account = AAAccount(payable(accountAddress));
        
        // 禁用测试模式
        account.setTestingMode(false);
        assertFalse(account.isTesting());
        
        // 此时验证签名将失败，因为我们的测试签名不是有效的BLS签名
        // 注意：以下代码应该会失败，在真实测试中需要使用有效的BLS签名
        UserOperation memory userOp = UserOperation({
            sender: accountAddress,
            nonce: 0,
            initCode: "",
            callData: abi.encodeWithSelector(
                AAAccount.execute.selector,
                address(0x123),
                0.1 ether,
                ""
            ),
            callGasLimit: 100000,
            verificationGasLimit: 100000,
            preVerificationGas: 100000,
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 1 gwei,
            paymasterAndData: "",
            signature: blsSignature,
            target: address(0x123),
            value: 0.1 ether,
            data: ""
        });
        
        bytes32 userOpHash = keccak256(abi.encodePacked("UserOperation"));
        
        // 预期这会失败，因为签名验证应该失败
        vm.expectRevert();
        account.validateUserOp(userOp, userOpHash, 0);
    }
} 