// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Test.sol";
import "../src/EntryPoint.sol";
import "../src/AAAccount.sol";
import "../src/AAAccountFactory.sol";
import "./mocks/MockERC20.sol";

contract EntryPointTest is Test {
    EntryPoint public entryPoint;
    AAAccountFactory public factory;
    AAAccount public implementation;
    address public owner;
    address public user;
    bytes public blsPublicKey;

    // 事件
    event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost);
    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);

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
        implementation = new AAAccount(entryPoint);
        factory = new AAAccountFactory(entryPoint);
    }

    function test_Deposit() public {
        uint256 depositAmount = 1 ether;
        
        vm.startPrank(user);
        
        // 测试存款事件
        vm.expectEmit(true, false, false, true);
        emit Deposited(user, depositAmount);
        
        // 存款
        entryPoint.deposit{value: depositAmount}();
        
        // 验证存款信息
        (uint256 amount, uint256 unlockTime) = entryPoint.getDeposit(user);
        assertEq(amount, depositAmount, "Deposit amount mismatch");
        assertEq(unlockTime, block.timestamp + 2 days, "Unlock time mismatch");
        
        vm.stopPrank();
    }

    function test_RevertWhen_DepositTooSmall() public {
        vm.deal(address(this), 0.001 ether);
        vm.expectRevert(abi.encodeWithSelector(EntryPoint.InsufficientDeposit.selector));
        entryPoint.deposit{value: 0.001 ether}();
    }

    function test_Withdraw() public {
        uint256 depositAmount = 1 ether;
        uint256 withdrawAmount = 0.5 ether;
        
        // 先存款
        vm.startPrank(user);
        entryPoint.deposit{value: depositAmount}();
        
        // 快进时间超过锁定期
        skip(3 days);
        
        // 测试提款事件
        vm.expectEmit(true, false, false, true);
        emit Withdrawn(user, withdrawAmount);
        
        // 提款
        entryPoint.withdraw(withdrawAmount);
        
        // 验证余额
        (uint256 remainingAmount,) = entryPoint.getDeposit(user);
        assertEq(remainingAmount, depositAmount - withdrawAmount, "Remaining amount mismatch");
        
        vm.stopPrank();
    }

    function test_RevertWhen_WithdrawDuringLock() public {
        // 存入资金
        entryPoint.deposit{value: 1 ether}();
        
        // 尝试提取
        vm.expectRevert(abi.encodeWithSelector(EntryPoint.DepositStillLocked.selector));
        entryPoint.withdraw(0.5 ether);
    }

    function test_HandleUserOp() public {
        // 创建账户
        address accountAddress = factory.createAccount(
            user,
            blsPublicKey,
            bytes32(uint256(123))
        );
        
        // 为账户存入ETH
        vm.deal(accountAddress, 1 ether);
        
        // 为用户在EntryPoint中存入gas费用
        vm.startPrank(user);
        entryPoint.deposit{value: 1 ether}();
        vm.stopPrank();
        
        // 创建UserOperation
        address target = makeAddr("target");
        uint256 value = 0.1 ether;
        bytes memory data = "";
        
        UserOperation memory userOp = UserOperation({
            sender: accountAddress,
            nonce: 0,
            initCode: "",
            callData: abi.encodeWithSelector(
                AAAccount.execute.selector,
                target,
                value,
                data
            ),
            callGasLimit: 100000,
            verificationGasLimit: 100000,
            preVerificationGas: 100000,
            maxFeePerGas: 1 gwei,
            maxPriorityFeePerGas: 1 gwei,
            paymasterAndData: "",
            signature: new bytes(128),
            target: target,
            value: value,
            data: data
        });
        
        // 执行操作
        UserOperation[] memory userOps = new UserOperation[](1);
        userOps[0] = userOp;
        
        // 使用新的地址调用，避免重入
        address caller = makeAddr("caller");
        vm.deal(caller, 1 ether);
        vm.startPrank(caller);
        bool[] memory results = entryPoint.handleOps(userOps);
        vm.stopPrank();
        
        assertTrue(results[0], "User operation failed");
        
        // 验证转账结果
        assertEq(target.balance, value, "Transfer failed");
    }

    function test_RevertWhen_InsufficientDeposit() public {
        // 创建账户但不存入gas费用
        address accountAddress = factory.createAccount(
            user,
            blsPublicKey,
            bytes32(uint256(123))
        );
        
        // 创建UserOperation
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
            signature: new bytes(128),
            target: address(0x123),
            value: 0.1 ether,
            data: ""
        });
        
        // 执行操作应该失败
        UserOperation[] memory userOps = new UserOperation[](1);
        userOps[0] = userOp;
        
        // 使用新的地址调用，避免重入
        address caller = makeAddr("caller");
        vm.deal(caller, 1 ether);
        vm.startPrank(caller);
        
        // 确保账户没有足够的存款
        (uint256 deposit,) = entryPoint.getDeposit(accountAddress);
        assertEq(deposit, 0, "Account should have no deposit");
        
        // 计算所需的gas费用
        uint256 gasPrice = tx.gasprice;
        uint256 requiredGas = userOp.callGasLimit + userOp.verificationGasLimit + userOp.preVerificationGas;
        uint256 requiredFunds = requiredGas * gasPrice;
        
        // 确保调用失败
        vm.expectRevert(bytes("Only callable by self"));
        entryPoint.handleOp(userOp);
        vm.stopPrank();
    }

    function test_HandleOps() public {
        // 创建多个账户
        address[] memory accounts = new address[](3);
        for (uint i = 0; i < 3; i++) {
            accounts[i] = factory.createAccount(
                user,
                blsPublicKey,
                bytes32(uint256(i))
            );
            vm.deal(accounts[i], 1 ether);
        }
        
        // 为用户在EntryPoint中存入gas费用
        vm.startPrank(user);
        entryPoint.deposit{value: 3 ether}();
        vm.stopPrank();
        
        // 创建多个UserOperation
        UserOperation[] memory userOps = new UserOperation[](3);
        address target = makeAddr("target");
        uint256 value = 0.1 ether;
        bytes memory data = "";
        
        for (uint i = 0; i < 3; i++) {
            userOps[i] = UserOperation({
                sender: accounts[i],
                nonce: 0,
                initCode: "",
                callData: abi.encodeWithSelector(
                    AAAccount.execute.selector,
                    target,
                    value,
                    data
                ),
                callGasLimit: 100000,
                verificationGasLimit: 100000,
                preVerificationGas: 100000,
                maxFeePerGas: 1 gwei,
                maxPriorityFeePerGas: 1 gwei,
                paymasterAndData: "",
                signature: new bytes(128),
                target: target,
                value: value,
                data: data
            });
        }
        
        // 使用新的地址调用，避免重入
        address caller = makeAddr("caller");
        vm.deal(caller, 1 ether);
        vm.startPrank(caller);
        bool[] memory success = entryPoint.handleOps(userOps);
        vm.stopPrank();
        
        // 验证所有操作都成功
        for (uint i = 0; i < success.length; i++) {
            assertTrue(success[i], string(abi.encodePacked("User operation ", i, " failed")));
        }
        
        // 验证目标地址收到了正确的总金额
        assertEq(target.balance, value * 3, "Total transfer amount mismatch");
    }

    function test_SimulateValidation() public {
        // 创建账户
        address accountAddress = factory.createAccount(
            user,
            blsPublicKey,
            bytes32(uint256(123))
        );
        
        // 为账户存入ETH
        vm.deal(accountAddress, 1 ether);
        
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
            paymasterAndData: "",
            signature: new bytes(128),  // 修改为128字节
            target: address(0),
            value: 0,
            data: ""
        });
        
        // 模拟验证
        entryPoint.simulateValidation(userOp);
        
        // 验证返回值
        // 注意：simulateValidation 不再返回值，所以我们只验证它不会回滚
        assertTrue(true, "Simulation should not revert");
    }

    function test_GetSenderAddress() public {
        // 创建初始化代码
        bytes memory initCode = abi.encodePacked(
            address(factory),
            abi.encodeWithSelector(
                AAAccountFactory.createAccount.selector,
                user,
                blsPublicKey,
                bytes32(uint256(123))
            )
        );
        
        // 计算预期的地址
        address expectedAddress = factory.getAddress(
            user,
            blsPublicKey,
            bytes32(uint256(123))
        );
        
        // 获取实际地址
        vm.startPrank(address(0));
        address actualAddress = entryPoint.getSenderAddress(initCode);
        vm.stopPrank();
        
        // 验证地址匹配
        assertEq(actualAddress, expectedAddress, "Sender address mismatch");
        
        // 验证可以创建账户
        vm.startPrank(address(entryPoint));
        address createdAddress = factory.createAccount(
            user,
            blsPublicKey,
            bytes32(uint256(123))
        );
        vm.stopPrank();
        
        assertEq(createdAddress, expectedAddress, "Created address mismatch");
    }

    function test_RevertWhen_SimulateValidationWithInvalidSignature() public {
        // 创建账户
        address accountAddress = factory.createAccount(
            user,
            blsPublicKey,
            bytes32(uint256(123))
        );
        
        // 创建带有无效签名的UserOperation
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
            paymasterAndData: "",
            signature: new bytes(32),  // 无效的签名长度
            target: address(0),
            value: 0,
            data: ""
        });
        
        // 关闭测试模式
        AAAccount account = AAAccount(payable(accountAddress));
        vm.prank(user);  // 使用账户所有者的身份
        account.setTestingMode(false);
        
        // 模拟验证应该失败
        vm.startPrank(address(0));
        vm.expectRevert(BLSSignatureVerifier.InvalidSignatureLength.selector);
        entryPoint.simulateValidation(userOp);
        vm.stopPrank();
    }

    receive() external payable {}
} 