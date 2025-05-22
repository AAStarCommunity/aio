// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../interfaces/UserOperation.sol";
import "../interfaces/IEntryPoint.sol";

/**
 * @title AAPaymaster
 * @dev 为AA账户提供gas费用支付的Paymaster合约
 */
contract AAPaymaster is Ownable {
    IEntryPoint public immutable entryPoint;
    
    // 支持的token列表及其兑换率
    mapping(address => uint256) public tokenExchangeRate;
    
    // 记录用户的使用情况
    mapping(address => uint256) public userQuota;
    
    // 最大免费配额
    uint256 public maxFreeQuota = 0.01 ether;
    
    event PaymasterFunded(address indexed funder, uint256 amount);
    event UserOperationSponsored(address indexed user, uint256 actualGasCost);
    event TokenSupported(address indexed token, uint256 exchangeRate);
    event QuotaIncreased(address indexed user, uint256 amount);
    
    error InsufficientEntryPointBalance();
    error UnsupportedToken(address token);
    error QuotaExceeded(address user);
    error InvalidUserOp();
    error InvalidSignature();
    
    constructor(IEntryPoint _entryPoint) {
        entryPoint = _entryPoint;
        _transferOwnership(msg.sender);
    }
    
    /**
     * @dev 接收ETH
     */
    receive() external payable {
        deposit();
    }
    
    /**
     * @dev 向EntryPoint存入ETH
     */
    function deposit() public payable {
        (bool success, ) = address(entryPoint).call{value: msg.value}("");
        require(success, "Failed to deposit to EntryPoint");
        emit PaymasterFunded(msg.sender, msg.value);
    }
    
    /**
     * @dev 从EntryPoint提取ETH
     * @param amount 提取金额
     */
    function withdraw(uint256 amount) external onlyOwner {
        (bool success, ) = address(entryPoint).call{gas: 100000}(
            abi.encodeWithSignature("withdrawTo(address,uint256)", owner(), amount)
        );
        require(success, "Failed to withdraw from EntryPoint");
    }
    
    /**
     * @dev 添加支持的token及其兑换率
     * @param token token地址
     * @param rate 兑换率 (token单位/ETH)
     */
    function addSupportedToken(address token, uint256 rate) external onlyOwner {
        tokenExchangeRate[token] = rate;
        emit TokenSupported(token, rate);
    }
    
    /**
     * @dev 为用户增加免费配额
     * @param user 用户地址
     * @param amount 配额增加量
     */
    function increaseUserQuota(address user, uint256 amount) external onlyOwner {
        userQuota[user] += amount;
        emit QuotaIncreased(user, amount);
    }
    
    /**
     * @dev 设置最大免费配额
     * @param newMaxQuota 新的最大配额
     */
    function setMaxFreeQuota(uint256 newMaxQuota) external onlyOwner {
        maxFreeQuota = newMaxQuota;
    }
    
    /**
     * @dev 验证用户操作，决定是否支付gas费用
     * @param userOp 用户操作
     * @param userOpHash 用户操作哈希
     * @param requiredPreFund 预先需要的资金
     */
    function validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        uint256 requiredPreFund
    ) external returns (bytes memory context, uint256 validationData) {
        // 确保调用者是EntryPoint
        require(msg.sender == address(entryPoint), "Only EntryPoint can call");
        
        // 检查EntryPoint余额是否足够
        if (address(entryPoint).balance < requiredPreFund) {
            revert InsufficientEntryPointBalance();
        }
        
        // 解析paymaster数据
        (address token, uint256 maxCost, bytes memory signature) = parsePaymasterData(userOp.paymasterAndData);
        
        // 验证用户签名
        validateUserSignature(userOp, userOpHash, signature);
        
        // 检查用户配额
        address sender = userOp.sender;
        if (userQuota[sender] >= requiredPreFund && userQuota[sender] <= maxFreeQuota) {
            // 使用免费配额
            userQuota[sender] -= requiredPreFund;
            return (abi.encode(sender, address(0), 0), 0);
        }
        
        // 如果提供了token地址，验证token支付
        if (token != address(0)) {
            // 检查token是否支持
            uint256 exchangeRate = tokenExchangeRate[token];
            if (exchangeRate == 0) {
                revert UnsupportedToken(token);
            }
            
            // 计算需要支付的token数量
            uint256 tokenAmount = requiredPreFund * exchangeRate / 1 ether;
            
            // 确保用户已经授权Paymaster使用其token
            IERC20 tokenContract = IERC20(token);
            if (tokenContract.allowance(sender, address(this)) < tokenAmount) {
                revert InvalidUserOp();
            }
            
            // 转移token
            bool success = tokenContract.transferFrom(sender, address(this), tokenAmount);
            if (!success) {
                revert InvalidUserOp();
            }
            
            // 返回上下文数据，用于postOp处理
            return (abi.encode(sender, token, tokenAmount), 0);
        }
        
        // 如果不使用token，拒绝请求
        revert QuotaExceeded(sender);
    }
    
    /**
     * @dev 在用户操作执行后进行处理
     * @param mode 处理模式
     * @param context 上下文数据
     * @param actualGasCost 实际gas成本
     */
    function postOp(
        uint8 mode,
        bytes calldata context,
        uint256 actualGasCost
    ) external {
        // 确保调用者是EntryPoint
        require(msg.sender == address(entryPoint), "Only EntryPoint can call");
        
        // 解析上下文
        (address user, address token, uint256 tokenAmount) = abi.decode(context, (address, address, uint256));
        
        // 如果是token支付，处理退款逻辑
        if (token != address(0) && tokenAmount > 0) {
            // 计算实际需要的token数量
            uint256 exchangeRate = tokenExchangeRate[token];
            uint256 actualTokenCost = actualGasCost * exchangeRate / 1 ether;
            
            // 如果预付的token多于实际消耗，退还差额
            if (actualTokenCost < tokenAmount) {
                uint256 refund = tokenAmount - actualTokenCost;
                bool success = IERC20(token).transfer(user, refund);
                require(success, "Token refund failed");
            }
        }
        
        emit UserOperationSponsored(user, actualGasCost);
    }
    
    /**
     * @dev 解析Paymaster数据
     * @param paymasterAndData Paymaster数据
     * @return token token地址
     * @return maxCost 最大成本
     * @return signature 签名
     */
    function parsePaymasterData(bytes calldata paymasterAndData) internal pure returns (
        address token,
        uint256 maxCost,
        bytes memory signature
    ) {
        // paymasterAndData的格式：
        // abi.encodePacked(paymaster_address, token, maxCost, signature)
        require(paymasterAndData.length >= 20 + 20 + 32 + 65, "Invalid paymasterAndData");
        
        uint256 offset = 20; // 跳过paymaster地址
        token = address(bytes20(paymasterAndData[offset:offset + 20]));
        offset += 20;
        
        maxCost = uint256(bytes32(paymasterAndData[offset:offset + 32]));
        offset += 32;
        
        signature = paymasterAndData[offset:];
        
        return (token, maxCost, signature);
    }
    
    /**
     * @dev 验证用户签名
     * @param userOp 用户操作
     * @param userOpHash 用户操作哈希
     * @param signature 签名
     */
    function validateUserSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash,
        bytes memory signature
    ) internal view {
        // 简单的签名验证示例，实际项目中应该调用AAAccount的验证逻辑
        // 或者使用更安全的验证方式
        
        // 这里仅作为示例，实际实现需要根据项目需求调整
        if (signature.length < 65) {
            revert InvalidSignature();
        }
    }
} 