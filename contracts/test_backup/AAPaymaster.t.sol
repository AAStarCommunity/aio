// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/paymaster/AAPaymaster.sol";
import "@account-abstraction/contracts/core/EntryPoint.sol";
import "@account-abstraction/contracts/interfaces/PackedUserOperation.sol";
import "../src/AAAccount.sol";
import "../src/AAAccountFactory.sol";
import "./mocks/MockERC20.sol";

contract AAPaymasterTest is Test {
    EntryPoint public entryPoint;
    AAPaymaster public paymaster;
    AAAccountFactory public factory;
    AAAccount public implementation;
    MockERC20 public token;
    
    address public owner;
    address public user;
    bytes public blsPublicKey;
    
    // 常量
    uint256 constant TOKEN_RATE = 1e15;  // 1 token = 0.001 ETH
    uint256 constant MIN_BALANCE = 100 * 1e18;  // 100 tokens
    
    // 事件
    event QuotaAdded(address indexed account, uint256 amount, uint256 dailyLimit);
    event QuotaUsed(address indexed account, uint256 amount);
    event TokenConfigUpdated(address indexed token, bool enabled, uint256 rate, uint256 minBalance);
    event TokenPaymentProcessed(address indexed account, address indexed token, uint256 tokenAmount, uint256 ethAmount);
    
    function setUp() public {
        // 设置测试账户
        owner = makeAddr("owner");
        user = makeAddr("user");
        vm.deal(owner, 100 ether);
        vm.deal(user, 100 ether);
        
        // 生成测试用的BLS公钥
        blsPublicKey = new bytes(48);
        for (uint8 i = 0; i < 48; i++) {
            blsPublicKey[i] = bytes1(i);
        }
        
        // 部署合约
        entryPoint = new EntryPoint();
        vm.startPrank(owner);
        paymaster = new AAPaymaster(entryPoint);
        implementation = new AAAccount(entryPoint);
        factory = new AAAccountFactory(entryPoint);
        token = new MockERC20();
        
        // 设置初始状态
        // 先给EntryPoint存入ETH
        entryPoint.deposit{value: 10 ether}();
        // 再给Paymaster存入ETH
        paymaster.deposit{value: 10 ether}();
        paymaster.configureToken(address(token), true, TOKEN_RATE, MIN_BALANCE);
        vm.stopPrank();
        
        // 给用户一些代币
        token.mint(user, 1000 * 1e18);
    }
    
    function test_AddFreeQuota() public {
        uint256 quotaAmount = 1 ether;
        uint256 dailyLimit = 2 ether;
        
        vm.startPrank(owner);
        
        // 测试添加配额事件
        vm.expectEmit(true, false, false, true);
        emit QuotaAdded(user, quotaAmount, dailyLimit);
        
        // 添加配额
        paymaster.addFreeQuota(user, quotaAmount, dailyLimit);
        
        // 验证配额信息
        (uint256 amount, uint256 resetTime, uint256 limit) = paymaster.freeQuotas(user);
        assertEq(amount, quotaAmount, "Quota amount mismatch");
        assertEq(resetTime, block.timestamp + 1 days, "Reset time mismatch");
        assertEq(limit, dailyLimit, "Daily limit mismatch");
        
        vm.stopPrank();
    }
    
    function test_ConfigureToken() public {
        address newToken = makeAddr("newToken");
        uint256 newRate = 2e15;
        uint256 newMinBalance = 200 * 1e18;
        
        vm.startPrank(owner);
        
        // 测试配置代币事件
        vm.expectEmit(true, false, false, true);
        emit TokenConfigUpdated(newToken, true, newRate, newMinBalance);
        
        // 配置代币
        paymaster.configureToken(newToken, true, newRate, newMinBalance);
        
        // 验证配置
        (bool enabled, uint256 rate, uint256 minBalance) = paymaster.tokenConfigs(newToken);
        assertTrue(enabled, "Token should be enabled");
        assertEq(rate, newRate, "Rate mismatch");
        assertEq(minBalance, newMinBalance, "Min balance mismatch");
        
        vm.stopPrank();
    }
    
    function test_ValidatePaymasterUserOp_FreeQuota() public {
        // 创建账户
        address accountAddress = factory.createAccount(
            user,
            blsPublicKey,
            bytes32(uint256(123))
        );
        
        // 添加免费配额
        vm.prank(owner);
        paymaster.addFreeQuota(accountAddress, 1 ether, 2 ether);
        
        // 创建UserOperation
        UserOperation memory userOp = UserOperation({
            sender: accountAddress,
            nonce: 0,
            initCode: "",
            callData: "",
            callGasLimit: 100000,
            verificationGasLimit: 100000,
            preVerificationGas: 100000,
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 1 gwei,
            paymasterAndData: abi.encodePacked(address(paymaster), uint8(PaymentType.FreeQuota)),
            signature: new bytes(64),
            target: address(0),
            value: 0,
            data: ""
        });
        
        // 模拟EntryPoint调用
        vm.prank(address(entryPoint));
        bytes memory context = paymaster.validatePaymasterUserOp(userOp, bytes32(0), 0.1 ether);
        
        // 验证返回的上下文
        (PaymentType paymentType, address account, uint256 cost) = abi.decode(context, (PaymentType, address, uint256));
        assertEq(uint8(paymentType), uint8(PaymentType.FreeQuota), "Payment type mismatch");
        assertEq(account, accountAddress, "Account mismatch");
        assertEq(cost, 0.1 ether, "Cost mismatch");
    }
    
    function test_ValidatePaymasterUserOp_TokenPayment() public {
        // 创建账户
        address accountAddress = factory.createAccount(
            user,
            blsPublicKey,
            bytes32(uint256(123))
        );
        
        // 计算所需代币数量
        uint256 ethCost = 0.1 ether;
        uint256 tokenAmount = (ethCost * 1e18) / TOKEN_RATE;
        
        // 给用户一些代币
        token.mint(accountAddress, tokenAmount + 1e18);
        
        // 授权paymaster使用代币
        vm.startPrank(accountAddress);
        token.approve(address(paymaster), type(uint256).max);
        vm.stopPrank();
        
        // 创建UserOperation
        UserOperation memory userOp = UserOperation({
            sender: accountAddress,
            nonce: 0,
            initCode: "",
            callData: "",
            callGasLimit: 100000,
            verificationGasLimit: 100000,
            preVerificationGas: 100000,
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 1 gwei,
            paymasterAndData: abi.encodePacked(
                address(paymaster),
                uint8(PaymentType.Token),
                address(token)
            ),
            signature: new bytes(64),
            target: address(0),
            value: 0,
            data: ""
        });
        
        // 模拟EntryPoint调用
        vm.prank(address(entryPoint));
        bytes memory context = paymaster.validatePaymasterUserOp(userOp, bytes32(0), ethCost);
        
        // 验证返回的上下文
        (PaymentType paymentType, address account, address tokenAddr, uint256 amount) = 
            abi.decode(context, (PaymentType, address, address, uint256));
        assertEq(uint8(paymentType), uint8(PaymentType.Token), "Payment type mismatch");
        assertEq(account, accountAddress, "Account mismatch");
        assertEq(tokenAddr, address(token), "Token mismatch");
        assertEq(amount, tokenAmount, "Token amount mismatch");
    }
    
    function test_RevertWhen_InsufficientQuota() public {
        // 创建账户
        address accountAddress = factory.createAccount(
            user,
            blsPublicKey,
            bytes32(uint256(123))
        );
        
        // 添加很小的免费配额
        vm.prank(owner);
        paymaster.addFreeQuota(user, 0.01 ether, 0.02 ether);
        
        // 创建需要大量gas的UserOperation
        UserOperation memory userOp = UserOperation({
            sender: accountAddress,
            nonce: 0,
            initCode: "",
            callData: "",
            callGasLimit: 100000,
            verificationGasLimit: 100000,
            preVerificationGas: 100000,
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 1 gwei,
            paymasterAndData: abi.encodePacked(address(paymaster), uint8(PaymentType.FreeQuota)),
            signature: new bytes(64),
            target: address(0),
            value: 0,
            data: ""
        });
        
        // 模拟EntryPoint调用，应该失败
        vm.prank(address(entryPoint));
        vm.expectRevert(AAPaymaster.InsufficientQuota.selector);
        paymaster.validatePaymasterUserOp(userOp, bytes32(0), 1 ether);
    }
    
    function test_RevertWhen_InsufficientTokenBalance() public {
        // 创建账户
        address accountAddress = factory.createAccount(
            user,
            blsPublicKey,
            bytes32(uint256(123))
        );
        
        // 清空用户代币余额
        vm.startPrank(user);
        token.transfer(address(0x1), token.balanceOf(user));
        vm.stopPrank();
        
        // 创建UserOperation
        UserOperation memory userOp = UserOperation({
            sender: accountAddress,
            nonce: 0,
            initCode: "",
            callData: "",
            callGasLimit: 100000,
            verificationGasLimit: 100000,
            preVerificationGas: 100000,
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 1 gwei,
            paymasterAndData: abi.encodePacked(
                address(paymaster),
                uint8(PaymentType.Token),
                address(token)
            ),
            signature: new bytes(64),
            target: address(0),
            value: 0,
            data: ""
        });
        
        // 模拟EntryPoint调用，应该失败
        vm.prank(address(entryPoint));
        vm.expectRevert(AAPaymaster.InsufficientTokenBalance.selector);
        paymaster.validatePaymasterUserOp(userOp, bytes32(0), 0.1 ether);
    }
    
    function test_PostOp_FreeQuota() public {
        // 创建账户
        address accountAddress = factory.createAccount(
            user,
            blsPublicKey,
            bytes32(uint256(123))
        );
        
        // 添加免费配额
        vm.prank(owner);
        paymaster.addFreeQuota(accountAddress, 1 ether, 2 ether);
        
        // 准备postOp上下文
        bytes memory context = abi.encode(
            PaymentType.FreeQuota,
            accountAddress,
            0.1 ether
        );
        
        // 记录初始配额
        (uint256 initialAmount,,) = paymaster.freeQuotas(accountAddress);
        
        // 模拟EntryPoint调用postOp
        vm.prank(address(entryPoint));
        paymaster.postOp(IPaymaster.PostOpMode.opSucceeded, context, 0.1 ether);
        
        // 验证配额被正确扣除
        (uint256 remainingAmount,,) = paymaster.freeQuotas(accountAddress);
        assertEq(remainingAmount, initialAmount - 0.1 ether, "Quota deduction mismatch");
    }
    
    function test_PostOp_TokenPayment() public {
        // 创建账户
        address accountAddress = factory.createAccount(
            user,
            blsPublicKey,
            bytes32(uint256(123))
        );
        
        // 计算所需代币数量
        uint256 ethCost = 0.1 ether;
        uint256 tokenAmount = (ethCost * 1e18) / TOKEN_RATE;
        
        // 给用户一些代币
        token.mint(accountAddress, tokenAmount + 1e18);
        
        // 授权paymaster使用代币
        vm.startPrank(accountAddress);
        token.approve(address(paymaster), type(uint256).max);
        vm.stopPrank();
        
        // 准备postOp上下文
        bytes memory context = abi.encode(
            PaymentType.Token,
            accountAddress,
            address(token),
            tokenAmount
        );
        
        // 记录初始余额
        uint256 initialBalance = token.balanceOf(accountAddress);
        
        // 模拟EntryPoint调用postOp
        vm.prank(address(entryPoint));
        paymaster.postOp(IPaymaster.PostOpMode.opSucceeded, context, ethCost);
        
        // 验证代币被正确扣除
        uint256 remainingBalance = token.balanceOf(accountAddress);
        assertEq(remainingBalance, initialBalance - tokenAmount, "Token deduction mismatch");
    }
    
    function test_QuotaReset() public {
        // 添加免费配额
        vm.prank(owner);
        paymaster.addFreeQuota(user, 1 ether, 2 ether);
        
        // 使用部分配额
        bytes memory context = abi.encode(
            PaymentType.FreeQuota,
            user,
            0.5 ether
        );
        
        vm.prank(address(entryPoint));
        paymaster.postOp(IPaymaster.PostOpMode.opSucceeded, context, 0.5 ether);
        
        // 快进时间超过一天
        skip(25 hours);
        
        // 添加新的配额，应该重置
        vm.prank(owner);
        paymaster.addFreeQuota(user, 1 ether, 2 ether);
        
        // 验证配额已重置
        (uint256 amount, uint256 resetTime,) = paymaster.freeQuotas(user);
        assertEq(amount, 1 ether, "Quota should be reset");
        assertTrue(resetTime > block.timestamp, "Reset time should be updated");
    }
    
    function test_EmergencyPause() public {
        // 暂停合约
        vm.prank(owner);
        paymaster.pause();
        assertTrue(paymaster.paused(), "Contract should be paused");
        
        // 创建UserOperation
        UserOperation memory userOp = UserOperation({
            sender: address(0),
            nonce: 0,
            initCode: "",
            callData: "",
            callGasLimit: 100000,
            verificationGasLimit: 100000,
            preVerificationGas: 100000,
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 1 gwei,
            paymasterAndData: abi.encodePacked(address(paymaster), uint8(PaymentType.FreeQuota)),
            signature: new bytes(64),
            target: address(0),
            value: 0,
            data: ""
        });
        
        // 验证暂停状态下无法验证操作
        vm.prank(address(entryPoint));
        vm.expectRevert(bytes4(keccak256("EnforcedPause()")));
        paymaster.validatePaymasterUserOp(userOp, bytes32(0), 0.1 ether);
        
        // 恢复合约
        vm.prank(owner);
        paymaster.unpause();
        assertFalse(paymaster.paused(), "Contract should be unpaused");
    }
    
    function test_MultiTokenPayment() public {
        // 部署第二个代币
        MockERC20 token2 = new MockERC20();
        
        // 配置第二个代币
        vm.startPrank(owner);
        paymaster.configureToken(address(token2), true, TOKEN_RATE * 2, MIN_BALANCE);
        vm.stopPrank();
        
        // 创建账户
        address accountAddress = factory.createAccount(
            user,
            blsPublicKey,
            bytes32(uint256(123))
        );
        
        // 计算所需代币数量
        uint256 ethCost = 0.1 ether;
        uint256 token1Amount = (ethCost * 1e18) / TOKEN_RATE;
        uint256 token2Amount = (ethCost * 1e18) / (TOKEN_RATE * 2);
        
        // 给用户一些代币
        token.mint(accountAddress, token1Amount + 1e18);
        token2.mint(accountAddress, token2Amount + 1e18);
        
        // 授权paymaster使用两种代币
        vm.startPrank(accountAddress);
        token.approve(address(paymaster), type(uint256).max);
        token2.approve(address(paymaster), type(uint256).max);
        vm.stopPrank();
        
        // 记录初始余额
        uint256 initialBalance1 = token.balanceOf(accountAddress);
        uint256 initialBalance2 = token2.balanceOf(accountAddress);
        
        // 测试使用第一种代币支付
        UserOperation memory userOp1 = UserOperation({
            sender: accountAddress,
            nonce: 0,
            initCode: "",
            callData: "",
            callGasLimit: 100000,
            verificationGasLimit: 100000,
            preVerificationGas: 100000,
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 1 gwei,
            paymasterAndData: abi.encodePacked(
                address(paymaster),
                uint8(PaymentType.Token),
                address(token)
            ),
            signature: new bytes(64),
            target: address(0),
            value: 0,
            data: ""
        });
        
        // 测试使用第二种代币支付
        UserOperation memory userOp2 = UserOperation({
            sender: accountAddress,
            nonce: 1,
            initCode: "",
            callData: "",
            callGasLimit: 100000,
            verificationGasLimit: 100000,
            preVerificationGas: 100000,
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 1 gwei,
            paymasterAndData: abi.encodePacked(
                address(paymaster),
                uint8(PaymentType.Token),
                address(token2)
            ),
            signature: new bytes(64),
            target: address(0),
            value: 0,
            data: ""
        });
        
        vm.startPrank(address(entryPoint));
        
        // 验证两种代币支付都能成功
        bytes memory context1 = paymaster.validatePaymasterUserOp(userOp1, bytes32(0), ethCost);
        bytes memory context2 = paymaster.validatePaymasterUserOp(userOp2, bytes32(0), ethCost);
        
        // 执行支付
        paymaster.postOp(IPaymaster.PostOpMode.opSucceeded, context1, ethCost);
        paymaster.postOp(IPaymaster.PostOpMode.opSucceeded, context2, ethCost);
        
        vm.stopPrank();
        
        // 验证两种代币都被正确扣除
        assertEq(token.balanceOf(accountAddress), initialBalance1 - token1Amount, "Token1 deduction mismatch");
        assertEq(token2.balanceOf(accountAddress), initialBalance2 - token2Amount, "Token2 deduction mismatch");
    }
    
    receive() external payable {}
} 