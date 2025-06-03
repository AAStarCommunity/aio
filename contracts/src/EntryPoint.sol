// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IEntryPoint.sol";
import "./interfaces/IAccount.sol";
import "./interfaces/IPaymaster.sol";
import "./libraries/UserOperationLib.sol";

/**
 * @title EntryPoint
 * @dev ERC-4337 EntryPoint 合约 - 处理账户抽象的核心合约
 */
contract EntryPoint is IEntryPoint, ReentrancyGuard {
    using UserOperationLib for UserOperation;

    // 存储结构
    struct DepositInfo {
        uint256 amount;      // 存款金额
        uint256 unlockTime;  // 解锁时间
    }

    // 存款映射
    mapping(address => DepositInfo) public deposits;

    // 常量
    uint256 private constant LOCK_PERIOD = 2 days;  // 存款锁定期
    uint256 private constant MIN_UNSTAKE_DELAY = 1 days;  // 最小解锁延迟
    uint256 private constant MIN_DEPOSIT = 0.01 ether;    // 最小存款金额

    // 事件
    event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost);
    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, uint256 amount);

    // 错误
    error InsufficientDeposit();
    error DepositStillLocked();
    error InvalidSignature();
    error InvalidUserOp();
    error PaymasterValidationFailed();
    error AccountValidationFailed();

    /**
     * @dev 处理用户操作
     * @param userOp 用户操作
     */
    function handleOp(UserOperation calldata userOp) external nonReentrant returns (bool success) {
        // 1. 验证用户操作
        bytes32 userOpHash = userOp.hash();
        _validateUserOp(userOp, userOpHash);

        // 2. 支付 gas 费用
        uint256 gasPrice = tx.gasprice;
        uint256 requiredGas = userOp.callGasLimit + userOp.verificationGasLimit + userOp.preVerificationGas;
        uint256 requiredFunds = requiredGas * gasPrice;

        // 3. 从 paymaster 或账户中扣除费用
        address paymaster = userOp.getPaymaster();
        if (paymaster != address(0)) {
            _deductFunds(paymaster, requiredFunds);
        } else {
            _deductFunds(userOp.sender, requiredFunds);
        }

        // 4. 执行用户操作
        uint256 preGas = gasleft();
        success = _executeUserOp(userOp);
        uint256 actualGas = preGas - gasleft();
        uint256 actualCost = actualGas * gasPrice;

        // 5. 退还多余的 gas 费用
        uint256 refund = requiredFunds - actualCost;
        if (refund > 0) {
            if (paymaster != address(0)) {
                _refundFunds(paymaster, refund);
            } else {
                _refundFunds(userOp.sender, refund);
            }
        }

        emit UserOperationEvent(userOpHash, userOp.sender, paymaster, userOp.nonce, success, actualCost);
    }

    /**
     * @dev 验证用户操作
     */
    function _validateUserOp(UserOperation calldata userOp, bytes32 userOpHash) internal {
        // 1. 基本验证
        if (userOp.callGasLimit == 0 || userOp.verificationGasLimit == 0) {
            revert InvalidUserOp();
        }

        // 2. 验证账户
        IAccount account = IAccount(userOp.sender);
        uint256 validationData = account.validateUserOp(userOp, userOpHash, 0);
        if (validationData != 0) {
            revert AccountValidationFailed();
        }

        // 3. 验证 paymaster（如果存在）
        address paymaster = userOp.getPaymaster();
        if (paymaster != address(0)) {
            IPaymaster paymasterContract = IPaymaster(paymaster);
            uint256 paymasterValidationData = uint256(uint160(bytes20(paymasterContract.validatePaymasterUserOp(userOp, userOpHash, 0))));
            if (paymasterValidationData != 0) {
                revert PaymasterValidationFailed();
            }
        }
    }

    /**
     * @dev 执行用户操作
     */
    function _executeUserOp(UserOperation calldata userOp) internal returns (bool success) {
        IAccount account = IAccount(userOp.sender);
        try account.execute(
            userOp.target,
            userOp.value,
            userOp.data
        ) {
            success = true;
        } catch {
            success = false;
        }
    }

    /**
     * @dev 存款
     */
    function deposit() external payable {
        if (msg.value < MIN_DEPOSIT) revert InsufficientDeposit();
        
        deposits[msg.sender].amount += msg.value;
        deposits[msg.sender].unlockTime = block.timestamp + LOCK_PERIOD;
        
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @dev 提取存款
     */
    function withdraw(uint256 amount) external nonReentrant {
        DepositInfo storage depositInfo = deposits[msg.sender];
        
        if (depositInfo.unlockTime > block.timestamp) {
            revert DepositStillLocked();
        }
        if (depositInfo.amount < amount) {
            revert InsufficientDeposit();
        }

        depositInfo.amount -= amount;
        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdrawal failed");
        
        emit Withdrawn(msg.sender, amount);
    }

    /**
     * @dev 从账户中扣除资金
     */
    function _deductFunds(address account, uint256 amount) internal {
        DepositInfo storage depositInfo = deposits[account];
        if (depositInfo.amount < amount) {
            revert InsufficientDeposit();
        }
        depositInfo.amount -= amount;
    }

    /**
     * @dev 退还资金给账户
     */
    function _refundFunds(address account, uint256 amount) internal {
        deposits[account].amount += amount;
    }

    /**
     * @dev 获取账户存款信息
     */
    function getDeposit(address account) external view returns (uint256 amount, uint256 unlockTime) {
        DepositInfo storage depositInfo = deposits[account];
        return (depositInfo.amount, depositInfo.unlockTime);
    }

    /**
     * @dev 模拟验证用户操作
     */
    function simulateValidation(UserOperation calldata userOp) external pure {
        bytes32 userOpHash = userOp.hash();
        // 在这里我们只返回哈希，不进行实际验证
        // 因为验证可能会修改状态
        userOpHash;
    }

    /**
     * @dev 获取用户操作哈希
     */
    function getUserOpHash(UserOperation calldata userOp, uint48 validUntil, uint48 validAfter) external pure returns (bytes32) {
        return keccak256(abi.encode(
            userOp.hash(),
            validUntil,
            validAfter
        ));
    }

    receive() external payable {
        this.deposit();
    }
} 