// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./interfaces/IAccount.sol";
import "./interfaces/IEntryPoint.sol";
import "./interfaces/IPaymaster.sol";
import "./interfaces/UserOperation.sol";

/**
 * @title EntryPoint
 * @dev ERC-4337 EntryPoint合约的简化实现
 * 注意：这是一个简化版本，仅用于演示，不应直接用于生产环境
 */
contract EntryPoint is IEntryPoint, ReentrancyGuard {
    using Address for address;
    
    // 存款映射
    mapping(address => uint256) public deposits;
    
    // 待处理的退款
    uint256 private _pendingRefund;
    
    // 事件
    event UserOperationEvent(bytes32 indexed userOpHash, address indexed sender, address indexed paymaster, uint256 nonce, bool success, uint256 actualGasCost);
    event Deposited(address indexed account, uint256 amount);
    event Withdrawn(address indexed account, address indexed withdrawAddress, uint256 amount);
    
    // 错误
    error NotEntryPoint();
    error InvalidUserOp();
    error PaymasterValidationFailed();
    error AccountValidationFailed();
    error GasLimitExceeded();
    error InsufficientFunds();
    
    /**
     * @dev 处理用户操作
     * @param ops 用户操作数组
     * @param beneficiary 受益人地址（获取退款）
     */
    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external override nonReentrant {
        uint256 opsLen = ops.length;
        uint256 totalGas = 0;
        
        for (uint256 i = 0; i < opsLen; i++) {
            totalGas += _handleOp(ops[i]);
        }
        
        // 退款给beneficiary
        uint256 refund = _pendingRefund;
        _pendingRefund = 0;
        if (refund > 0 && beneficiary != address(0)) {
            (bool success, ) = beneficiary.call{value: refund}("");
            require(success, "Refund failed");
        }
    }
    
    /**
     * @dev 处理单个用户操作
     * @param op 用户操作
     * @return actualGasCost 实际gas成本
     */
    function _handleOp(UserOperation calldata op) internal returns (uint256 actualGasCost) {
        uint256 preGas = gasleft();
        bytes32 userOpHash = _getUserOpHash(op);
        
        // 确保账户存在
        address sender = op.sender;
        if (sender.code.length == 0) {
            // 如果账户不存在，尝试使用initCode创建
            if (op.initCode.length == 0) {
                revert InvalidUserOp();
            }
            
            _createAccount(op.initCode);
            // 确保账户现在存在
            if (sender.code.length == 0) {
                revert InvalidUserOp();
            }
        }
        
        // 验证用户操作
        IAccount account = IAccount(sender);
        
        // 验证账户余额是否足够支付gas费用
        uint256 missingAccountFunds = 0;
        address paymaster = address(0);
        bytes memory paymasterContext;
        
        if (op.paymasterAndData.length > 0) {
            // 使用Paymaster
            paymaster = _getPaymaster(op.paymasterAndData);
            if (paymaster.code.length == 0) {
                revert InvalidUserOp();
            }
            
            // 计算预估的gas费用
            uint256 requiredPreFund = _getRequiredPrefund(op);
            
            // 验证Paymaster
            IPaymaster paymasterContract = IPaymaster(paymaster);
            try paymasterContract.validatePaymasterUserOp(op, userOpHash, requiredPreFund) returns (bytes memory context, uint256 validationData) {
                // 验证通过
                if (validationData != 0) {
                    revert PaymasterValidationFailed();
                }
                paymasterContext = context;
            } catch {
                revert PaymasterValidationFailed();
            }
        } else {
            // 不使用Paymaster，验证账户余额
            uint256 requiredPreFund = _getRequiredPrefund(op);
            uint256 deposit = deposits[sender];
            if (deposit < requiredPreFund) {
                missingAccountFunds = requiredPreFund - deposit;
            }
        }
        
        // 验证账户
        try account.validateUserOp(op, userOpHash, missingAccountFunds) returns (uint256 validationData) {
            // 验证通过
            if (validationData != 0) {
                revert AccountValidationFailed();
            }
        } catch {
            revert AccountValidationFailed();
        }
        
        // 执行用户操作
        _executeUserOp(op);
        
        // 计算实际gas成本
        uint256 gasUsed = preGas - gasleft();
        actualGasCost = gasUsed * (op.maxFeePerGas + block.basefee < op.maxFeePerGas ? block.basefee : op.maxFeePerGas);
        
        // 如果使用了Paymaster，调用postOp
        if (paymaster != address(0)) {
            IPaymaster paymasterContract = IPaymaster(paymaster);
            // mode=0 表示成功
            try paymasterContract.postOp(0, paymasterContext, actualGasCost) {
                // 成功调用postOp
            } catch {
                // 忽略postOp中的错误
            }
        } else {
            // 从账户存款中扣除gas费用
            deposits[sender] = deposits[sender] >= actualGasCost ? deposits[sender] - actualGasCost : 0;
            _pendingRefund += actualGasCost;
        }
        
        emit UserOperationEvent(userOpHash, sender, paymaster, op.nonce, true, actualGasCost);
        
        return actualGasCost;
    }
    
    /**
     * @dev 从initCode创建账户
     * @param initCode 初始化代码
     */
    function _createAccount(bytes calldata initCode) internal {
        if (initCode.length < 20) {
            revert InvalidUserOp();
        }
        
        address factory = address(bytes20(initCode[:20]));
        bytes memory factoryCallData = initCode[20:];
        
        // 调用工厂合约创建账户
        (bool success, ) = factory.call(factoryCallData);
        if (!success) {
            revert InvalidUserOp();
        }
    }
    
    /**
     * @dev 执行用户操作
     * @param op 用户操作
     */
    function _executeUserOp(UserOperation calldata op) internal {
        // 从callData中提取函数调用数据
        if (op.callData.length == 0) {
            return; // 没有调用数据，直接返回
        }
        
        // 提取目标地址、值和函数数据
        address target;
        uint256 value;
        bytes memory func;
        
        // 简单解析callData (示例格式：调用execute(address,uint256,bytes))
        // 实际实现应根据项目需求进行调整
        bytes4 selector = bytes4(op.callData[:4]);
        if (selector == bytes4(keccak256("execute(address,uint256,bytes)"))) {
            (target, value, func) = abi.decode(op.callData[4:], (address, uint256, bytes));
            
            // 调用账户的execute方法
            (bool success, ) = op.sender.call(op.callData);
            if (!success) {
                revert InvalidUserOp();
            }
        } else if (selector == bytes4(keccak256("executeBatch(address[],uint256[],bytes[])"))) {
            // 处理批量执行
            (bool success, ) = op.sender.call(op.callData);
            if (!success) {
                revert InvalidUserOp();
            }
        } else {
            // 未知的函数选择器
            revert InvalidUserOp();
        }
    }
    
    /**
     * @dev 获取Paymaster地址
     * @param paymasterAndData Paymaster数据
     * @return paymaster Paymaster地址
     */
    function _getPaymaster(bytes calldata paymasterAndData) internal pure returns (address paymaster) {
        if (paymasterAndData.length < 20) {
            revert InvalidUserOp();
        }
        return address(bytes20(paymasterAndData[:20]));
    }
    
    /**
     * @dev 计算预估的gas费用
     * @param op 用户操作
     * @return requiredPreFund 预估的gas费用
     */
    function _getRequiredPrefund(UserOperation calldata op) internal view returns (uint256 requiredPreFund) {
        uint256 maxGasPrice = op.maxFeePerGas;
        uint256 gasLimit = op.callGasLimit + op.verificationGasLimit + op.preVerificationGas;
        return gasLimit * maxGasPrice;
    }
    
    /**
     * @dev 获取用户操作哈希
     * @param op 用户操作
     * @return 用户操作哈希
     */
    function _getUserOpHash(UserOperation calldata op) internal view returns (bytes32) {
        return keccak256(abi.encode(
            op.sender,
            op.nonce,
            keccak256(op.initCode),
            keccak256(op.callData),
            op.callGasLimit,
            op.verificationGasLimit,
            op.preVerificationGas,
            op.maxFeePerGas,
            op.maxPriorityFeePerGas,
            keccak256(op.paymasterAndData),
            block.chainid,
            address(this)
        ));
    }
    
    /**
     * @dev 模拟验证用户操作
     * @param userOp 用户操作
     */
    function simulateValidation(UserOperation calldata userOp) external override {
        bytes32 userOpHash = _getUserOpHash(userOp);
        
        // 验证账户
        if (userOp.sender.code.length > 0) {
            IAccount account = IAccount(userOp.sender);
            account.validateUserOp(userOp, userOpHash, 0);
        }
        
        // 验证Paymaster
        if (userOp.paymasterAndData.length > 0) {
            address paymaster = _getPaymaster(userOp.paymasterAndData);
            IPaymaster paymasterContract = IPaymaster(paymaster);
            uint256 requiredPreFund = _getRequiredPrefund(userOp);
            paymasterContract.validatePaymasterUserOp(userOp, userOpHash, requiredPreFund);
        }
    }
    
    /**
     * @dev 获取用户操作哈希
     * @param userOp 用户操作
     * @param validUntil 有效期限
     * @param validAfter 生效时间
     */
    function getUserOpHash(UserOperation calldata userOp, uint48 validUntil, uint48 validAfter) external view override returns (bytes32) {
        bytes32 userOpHash = _getUserOpHash(userOp);
        return keccak256(abi.encode(userOpHash, validUntil, validAfter));
    }
    
    /**
     * @dev 存款
     * @param account 存款账户
     */
    function depositTo(address account) external payable {
        deposits[account] += msg.value;
        emit Deposited(account, msg.value);
    }
    
    /**
     * @dev 为自己存款
     */
    function deposit() external payable {
        depositTo(msg.sender);
    }
    
    /**
     * @dev 提款
     * @param withdrawAddress 提款地址
     * @param amount 提款金额
     */
    function withdrawTo(address payable withdrawAddress, uint256 amount) external {
        uint256 currentDeposit = deposits[msg.sender];
        if (amount > currentDeposit) {
            revert InsufficientFunds();
        }
        deposits[msg.sender] = currentDeposit - amount;
        emit Withdrawn(msg.sender, withdrawAddress, amount);
        (bool success, ) = withdrawAddress.call{value: amount}("");
        require(success, "Withdraw failed");
    }
    
    /**
     * @dev 接收ETH
     */
    receive() external payable {
        deposit();
    }
} 