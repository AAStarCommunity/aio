// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ValidatorRegistry
 * @dev BLS验证节点注册表 - 管理参与BLS签名的验证节点
 */
contract ValidatorRegistry is Ownable, ReentrancyGuard {
    
    // 验证节点结构
    struct Validator {
        address validatorAddress;    // 节点地址
        bytes blsPublicKey;         // BLS公钥 (48字节)
        bool isActive;              // 是否活跃
        uint256 registeredAt;       // 注册时间
        string endpoint;            // 节点RPC端点（可选）
        uint256 stake;              // 质押金额（未来扩展）
    }
    
    // 存储
    mapping(address => Validator) public validators;
    address[] public validatorList;
    mapping(address => uint256) public validatorIndex; // 地址到索引的映射
    
    // 配置参数
    uint256 public requiredValidators = 3;      // 需要的最少验证节点数
    uint256 public maxValidators = 10;          // 最大验证节点数
    uint256 public minStake = 0.1 ether;       // 最小质押金额（未来使用）
    
    // 事件
    event ValidatorRegistered(
        address indexed validator,
        bytes blsPublicKey,
        string endpoint
    );
    
    event ValidatorDeactivated(address indexed validator);
    event ValidatorActivated(address indexed validator);
    event ValidatorRemoved(address indexed validator);
    event RequiredValidatorsUpdated(uint256 oldValue, uint256 newValue);
    
    // 错误
    error ValidatorAlreadyExists();
    error ValidatorNotFound();
    error InvalidPublicKeyLength();
    error MaxValidatorsReached();
    error InsufficientValidators();
    error InvalidRequiredValidators();
    
    constructor() Ownable(msg.sender) {
        // 构造函数中设置初始所有者
    }
    
    /**
     * @dev 注册新的验证节点
     * @param validatorAddress 验证节点地址
     * @param blsPublicKey BLS公钥 (48字节)
     * @param endpoint 节点RPC端点
     */
    function registerValidator(
        address validatorAddress,
        bytes calldata blsPublicKey,
        string calldata endpoint
    ) external onlyOwner nonReentrant {
        if (validators[validatorAddress].validatorAddress != address(0)) {
            revert ValidatorAlreadyExists();
        }
        
        if (blsPublicKey.length != 48) {
            revert InvalidPublicKeyLength();
        }
        
        if (validatorList.length >= maxValidators) {
            revert MaxValidatorsReached();
        }
        
        // 创建验证节点记录
        validators[validatorAddress] = Validator({
            validatorAddress: validatorAddress,
            blsPublicKey: blsPublicKey,
            isActive: true,
            registeredAt: block.timestamp,
            endpoint: endpoint,
            stake: 0 // 暂时设为0，未来支持质押
        });
        
        // 添加到列表
        validatorIndex[validatorAddress] = validatorList.length;
        validatorList.push(validatorAddress);
        
        emit ValidatorRegistered(validatorAddress, blsPublicKey, endpoint);
    }
    
    /**
     * @dev 激活验证节点
     * @param validatorAddress 验证节点地址
     */
    function activateValidator(address validatorAddress) external onlyOwner {
        if (validators[validatorAddress].validatorAddress == address(0)) {
            revert ValidatorNotFound();
        }
        
        validators[validatorAddress].isActive = true;
        emit ValidatorActivated(validatorAddress);
    }
    
    /**
     * @dev 停用验证节点
     * @param validatorAddress 验证节点地址
     */
    function deactivateValidator(address validatorAddress) external onlyOwner {
        if (validators[validatorAddress].validatorAddress == address(0)) {
            revert ValidatorNotFound();
        }
        
        validators[validatorAddress].isActive = false;
        
        // 检查剩余活跃节点数量
        uint256 activeCount = getActiveValidatorCount();
        if (activeCount < requiredValidators) {
            revert InsufficientValidators();
        }
        
        emit ValidatorDeactivated(validatorAddress);
    }
    
    /**
     * @dev 移除验证节点（危险操作）
     * @param validatorAddress 验证节点地址
     */
    function removeValidator(address validatorAddress) external onlyOwner {
        if (validators[validatorAddress].validatorAddress == address(0)) {
            revert ValidatorNotFound();
        }
        
        uint256 index = validatorIndex[validatorAddress];
        uint256 lastIndex = validatorList.length - 1;
        
        // 将最后一个元素移到要删除的位置
        if (index != lastIndex) {
            address lastValidator = validatorList[lastIndex];
            validatorList[index] = lastValidator;
            validatorIndex[lastValidator] = index;
        }
        
        // 删除最后一个元素
        validatorList.pop();
        delete validatorIndex[validatorAddress];
        delete validators[validatorAddress];
        
        // 检查剩余活跃节点数量
        uint256 activeCount = getActiveValidatorCount();
        if (activeCount < requiredValidators) {
            revert InsufficientValidators();
        }
        
        emit ValidatorRemoved(validatorAddress);
    }
    
    /**
     * @dev 获取所有活跃验证节点的BLS公钥
     * @return publicKeys BLS公钥数组
     */
    function getActiveValidatorKeys() external view returns (bytes[] memory publicKeys) {
        uint256 activeCount = getActiveValidatorCount();
        publicKeys = new bytes[](activeCount);
        
        uint256 keyIndex = 0;
        for (uint256 i = 0; i < validatorList.length; i++) {
            address validatorAddr = validatorList[i];
            if (validators[validatorAddr].isActive) {
                publicKeys[keyIndex] = validators[validatorAddr].blsPublicKey;
                keyIndex++;
            }
        }
    }
    
    /**
     * @dev 获取所有活跃验证节点地址
     * @return addresses 活跃验证节点地址数组
     */
    function getActiveValidators() external view returns (address[] memory addresses) {
        uint256 activeCount = getActiveValidatorCount();
        addresses = new address[](activeCount);
        
        uint256 addrIndex = 0;
        for (uint256 i = 0; i < validatorList.length; i++) {
            address validatorAddr = validatorList[i];
            if (validators[validatorAddr].isActive) {
                addresses[addrIndex] = validatorAddr;
                addrIndex++;
            }
        }
    }
    
    /**
     * @dev 获取活跃验证节点数量
     * @return count 活跃节点数量
     */
    function getActiveValidatorCount() public view returns (uint256 count) {
        for (uint256 i = 0; i < validatorList.length; i++) {
            if (validators[validatorList[i]].isActive) {
                count++;
            }
        }
    }
    
    /**
     * @dev 获取所有验证节点数量
     * @return count 总节点数量
     */
    function getTotalValidatorCount() external view returns (uint256 count) {
        return validatorList.length;
    }
    
    /**
     * @dev 检查验证节点是否活跃
     * @param validatorAddress 验证节点地址
     * @return isActive 是否活跃
     */
    function isValidatorActive(address validatorAddress) external view returns (bool isActive) {
        return validators[validatorAddress].isActive;
    }
    
    /**
     * @dev 获取验证节点信息
     * @param validatorAddress 验证节点地址
     * @return validator 验证节点信息
     */
    function getValidatorInfo(address validatorAddress) external view returns (Validator memory validator) {
        return validators[validatorAddress];
    }
    
    /**
     * @dev 设置需要的最少验证节点数
     * @param newRequiredValidators 新的最少节点数
     */
    function setRequiredValidators(uint256 newRequiredValidators) external onlyOwner {
        if (newRequiredValidators == 0 || newRequiredValidators > validatorList.length) {
            revert InvalidRequiredValidators();
        }
        
        uint256 oldValue = requiredValidators;
        requiredValidators = newRequiredValidators;
        
        emit RequiredValidatorsUpdated(oldValue, newRequiredValidators);
    }
    
    /**
     * @dev 设置最大验证节点数
     * @param newMaxValidators 新的最大节点数
     */
    function setMaxValidators(uint256 newMaxValidators) external onlyOwner {
        require(newMaxValidators >= requiredValidators, "Max must be >= required");
        require(newMaxValidators >= validatorList.length, "Max must be >= current count");
        maxValidators = newMaxValidators;
    }
    
    /**
     * @dev 检查是否有足够的活跃验证节点进行BLS签名
     * @return sufficient 是否有足够的节点
     */
    function hasSufficientValidators() external view returns (bool sufficient) {
        return getActiveValidatorCount() >= requiredValidators;
    }
    
    /**
     * @dev 批量注册验证节点（用于初始化）
     * @param validatorAddresses 验证节点地址数组
     * @param blsPublicKeys BLS公钥数组
     * @param endpoints 端点数组
     */
    function batchRegisterValidators(
        address[] calldata validatorAddresses,
        bytes[] calldata blsPublicKeys,
        string[] calldata endpoints
    ) external onlyOwner {
        require(
            validatorAddresses.length == blsPublicKeys.length && 
            blsPublicKeys.length == endpoints.length,
            "Array length mismatch"
        );
        
        for (uint256 i = 0; i < validatorAddresses.length; i++) {
            if (validators[validatorAddresses[i]].validatorAddress == address(0)) {
                registerValidator(validatorAddresses[i], blsPublicKeys[i], endpoints[i]);
            }
        }
    }
}