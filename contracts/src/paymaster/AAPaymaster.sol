// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "../interfaces/IPaymaster.sol";
import "../interfaces/IEntryPoint.sol";

/**
 * @title AAPaymaster
 * @dev 支付代理合约 - 为用户支付 gas 费用
 */
contract AAPaymaster is IPaymaster, Ownable, ReentrancyGuard, Pausable {
    IEntryPoint public immutable entryPoint;
    
    // 免费配额结构
    struct FreeQuota {
        uint256 amount;        // 剩余配额
        uint256 resetTime;     // 重置时间
        uint256 dailyLimit;    // 每日限额
    }
    
    // ERC20 代币支付配置
    struct TokenPaymentConfig {
        bool enabled;          // 是否启用
        uint256 rate;         // 兑换比率（1 token = rate wei）
        uint256 minBalance;   // 最小余额要求
    }
    
    // 存储
    mapping(address => FreeQuota) public freeQuotas;
    mapping(address => TokenPaymentConfig) public tokenConfigs;
    mapping(address => uint256) public tokenBalances;
    
    // 常量
    uint256 private constant QUOTA_PERIOD = 1 days;
    uint256 private constant MIN_DEPOSIT = 0.01 ether;
    
    // 事件
    event QuotaAdded(address indexed account, uint256 amount, uint256 dailyLimit);
    event QuotaUsed(address indexed account, uint256 amount);
    event TokenConfigUpdated(address indexed token, bool enabled, uint256 rate, uint256 minBalance);
    event TokenPaymentProcessed(address indexed account, address indexed token, uint256 tokenAmount, uint256 ethAmount);
    
    // 错误
    error InsufficientQuota();
    error InsufficientTokenBalance();
    error TokenNotSupported();
    error InvalidRate();
    error QuotaStillValid();
    error InsufficientDeposit();
    
    constructor(IEntryPoint _entryPoint) Ownable(msg.sender) {
        entryPoint = _entryPoint;
    }
    
    /**
     * @dev 验证用户操作并处理支付
     */
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 maxCost
    ) external whenNotPaused returns (bytes memory context) {
        // 确保调用者是 EntryPoint
        require(msg.sender == address(entryPoint), "Caller not EntryPoint");
        
        // 解析支付数据
        (address token, PaymentType paymentType) = _parsePaymasterData(userOp.paymasterAndData);
        
        if (paymentType == PaymentType.FreeQuota) {
            // 检查免费配额
            _validateFreeQuota(userOp.sender, maxCost);
            context = abi.encode(PaymentType.FreeQuota, userOp.sender, maxCost);
        } else if (paymentType == PaymentType.Token) {
            // 检查代币支付
            require(token != address(0), "Invalid token");
            uint256 tokenAmount = _calculateTokenAmount(token, maxCost);
            _validateTokenPayment(userOp.sender, token, tokenAmount);
            context = abi.encode(PaymentType.Token, userOp.sender, token, tokenAmount);
        }
    }
    
    /**
     * @dev 操作后的处理
     */
    function postOp(
        PostOpMode mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external {
        // 确保调用者是 EntryPoint
        require(msg.sender == address(entryPoint), "Caller not EntryPoint");
        
        // 解析上下文数据
        (PaymentType paymentType, address account) = abi.decode(context, (PaymentType, address));
        
        if (paymentType == PaymentType.FreeQuota) {
            // 扣除免费配额
            _deductFreeQuota(account, actualGasCost);
        } else if (paymentType == PaymentType.Token) {
            // 处理代币支付
            (,, address token, uint256 tokenAmount) = abi.decode(context, (PaymentType, address, address, uint256));
            _processTokenPayment(account, token, tokenAmount, actualGasCost);
        }
    }
    
    /**
     * @dev 添加免费配额
     */
    function addFreeQuota(address account, uint256 amount, uint256 dailyLimit) external onlyOwner {
        FreeQuota storage quota = freeQuotas[account];
        
        // 如果配额未过期，则累加
        if (quota.resetTime > block.timestamp) {
            quota.amount += amount;
        } else {
            // 重置配额
            quota.amount = amount;
            quota.resetTime = block.timestamp + QUOTA_PERIOD;
        }
        
        quota.dailyLimit = dailyLimit;
        emit QuotaAdded(account, amount, dailyLimit);
    }
    
    /**
     * @dev 配置代币支付
     */
    function configureToken(
        address token,
        bool enabled,
        uint256 rate,
        uint256 minBalance
    ) external onlyOwner {
        if (rate == 0) revert InvalidRate();
        
        tokenConfigs[token] = TokenPaymentConfig({
            enabled: enabled,
            rate: rate,
            minBalance: minBalance
        });
        
        emit TokenConfigUpdated(token, enabled, rate, minBalance);
    }
    
    /**
     * @dev 存入 ETH
     */
    function deposit() external payable {
        if (msg.value < MIN_DEPOSIT) revert InsufficientDeposit();
        
        // 将存款转发给 EntryPoint
        (bool success,) = address(entryPoint).call{value: msg.value}("");
        require(success, "Deposit failed");
    }
    
    /**
     * @dev 存入代币
     */
    function depositToken(address token, uint256 amount) external nonReentrant {
        TokenPaymentConfig memory config = tokenConfigs[token];
        if (!config.enabled) revert TokenNotSupported();
        
        // 转入代币
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        tokenBalances[token] += amount;
    }
    
    // 内部函数
    
    function _validateFreeQuota(address account, uint256 cost) internal view {
        FreeQuota storage quota = freeQuotas[account];
        if (quota.amount < cost || block.timestamp > quota.resetTime) {
            revert InsufficientQuota();
        }
    }
    
    function _validateTokenPayment(address account, address token, uint256 tokenAmount) internal view {
        TokenPaymentConfig memory config = tokenConfigs[token];
        if (!config.enabled) revert TokenNotSupported();
        
        uint256 balance = IERC20(token).balanceOf(account);
        if (balance < tokenAmount) revert InsufficientTokenBalance();
    }
    
    function _deductFreeQuota(address account, uint256 cost) internal {
        FreeQuota storage quota = freeQuotas[account];
        quota.amount -= cost;
        emit QuotaUsed(account, cost);
    }
    
    function _processTokenPayment(address account, address token, uint256 tokenAmount, uint256 ethAmount) internal {
        // 转移代币
        IERC20(token).transferFrom(account, address(this), tokenAmount);
        tokenBalances[token] += tokenAmount;
        
        emit TokenPaymentProcessed(account, token, tokenAmount, ethAmount);
    }
    
    function _calculateTokenAmount(address token, uint256 ethAmount) internal view returns (uint256) {
        TokenPaymentConfig memory config = tokenConfigs[token];
        return (ethAmount * 1e18) / config.rate;
    }
    
    function _parsePaymasterData(bytes calldata paymasterAndData) internal pure returns (address token, PaymentType paymentType) {
        // paymasterAndData 格式：
        // paymaster (20 bytes) + type (1 byte) + token (20 bytes, optional)
        require(paymasterAndData.length >= 21, "Invalid paymaster data");
        
        paymentType = PaymentType(uint8(paymasterAndData[20]));
        if (paymentType == PaymentType.Token) {
            require(paymasterAndData.length >= 41, "Invalid token data");
            token = address(bytes20(paymasterAndData[21:41]));
        }
    }
    
    receive() external payable {
        this.deposit();
    }

    /**
     * @dev 暂停合约
     */
    function pause() external onlyOwner {
        _pause();
    }

    /**
     * @dev 恢复合约
     */
    function unpause() external onlyOwner {
        _unpause();
    }
}

enum PaymentType {
    FreeQuota,
    Token
} 