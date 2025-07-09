// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IEntryPoint.sol";
import "./interfaces/IAccount.sol";
import "./interfaces/IPaymaster.sol";
import "./interfaces/IAAAccountFactory.sol";
import "./libraries/UserOperationLib.sol";

/**
 * @title EntryPoint
 * @dev ERC-4337 EntryPoint 合约 - 处理账户抽象的核心合约
 */
contract EntryPoint is IEntryPoint, ReentrancyGuard {
    using UserOperationLib for UserOperation;

    // 存储结构
    struct DepositInfo {
        uint256 deposit;
        bool staked;
        uint112 stake;
        uint32 unstakeDelaySec;
        uint48 withdrawTime;
    }

    // 存款映射
    mapping(address => DepositInfo) public deposits;

    // 常量
    uint256 private constant MIN_UNSTAKE_DELAY = 1 days;  // 最小解锁延迟
    uint256 private constant MIN_DEPOSIT = 0.01 ether;    // 最小存款金额

    // 事件已在接口中定义

    // 用户操作信息结构
    struct UserOpInfo {
        bytes32 mUserOpHash;
        uint256 prefund;
        bytes context;
        uint256 preOpGas;
    }

    /**
     * @dev 批量处理用户操作 - ERC-4337标准方法
     * @param ops 用户操作数组
     * @param beneficiary 接收资金的地址
     */
    function handleOps(UserOperation[] calldata ops, address payable beneficiary) external nonReentrant {
        uint256 opslen = ops.length;
        UserOpInfo[] memory opInfos = new UserOpInfo[](opslen);
        
        unchecked {
            for (uint256 i = 0; i < opslen; i++) {
                UserOpInfo memory opInfo = opInfos[i];
                (uint256 validationData, uint256 pmValidationData) = _validateUserOp(ops[i], opInfo, i);
                
                // 部署账户（如果需要）
                if (ops[i].initCode.length > 0) {
                    _deployAccount(ops[i], opInfo.mUserOpHash);
                }
                
                // 计算预付费
                uint256 missingAccountFunds = 0;
                if (opInfo.prefund > 0) {
                    missingAccountFunds = _chargeFunds(ops[i], opInfo.prefund);
                }
                
                // 检查预付费是否足够
                if (missingAccountFunds > 0) {
                    revert FailedOp(i, "AA21 didn't pay prefund");
                }
                
                // 执行用户操作
                _executeUserOp(i, ops[i], opInfo, opInfos);
            }
        }
        
        // 补偿打包者
        _compensate(beneficiary);
    }

    /**
     * @dev 处理聚合签名的用户操作
     * @param opsPerAggregator 每个聚合器的操作数组
     * @param beneficiary 接收资金的地址
     */
    function handleAggregatedOps(UserOpsPerAggregator[] calldata opsPerAggregator, address payable beneficiary) external nonReentrant {
        uint256 totalOps = 0;
        for (uint256 i = 0; i < opsPerAggregator.length; i++) {
            totalOps += opsPerAggregator[i].userOps.length;
        }
        
        UserOpInfo[] memory opInfos = new UserOpInfo[](totalOps);
        uint256 opIndex = 0;
        
        for (uint256 a = 0; a < opsPerAggregator.length; a++) {
            UserOpsPerAggregator calldata opa = opsPerAggregator[a];
            for (uint256 i = 0; i < opa.userOps.length; i++) {
                UserOpInfo memory opInfo = opInfos[opIndex];
                (uint256 validationData, uint256 pmValidationData) = _validateUserOp(opa.userOps[i], opInfo, opIndex);
                
                // 部署账户（如果需要）
                if (opa.userOps[i].initCode.length > 0) {
                    _deployAccount(opa.userOps[i], opInfo.mUserOpHash);
                }
                
                // 计算预付费
                uint256 missingAccountFunds = 0;
                if (opInfo.prefund > 0) {
                    missingAccountFunds = _chargeFunds(opa.userOps[i], opInfo.prefund);
                }
                
                if (missingAccountFunds > 0) {
                    revert FailedOp(opIndex, "AA21 didn't pay prefund");
                }
                
                // 执行用户操作
                _executeUserOp(opIndex, opa.userOps[i], opInfo, opInfos);
                opIndex++;
            }
        }
        
        // 补偿打包者
        _compensate(beneficiary);
    }

    /**
     * @dev 验证用户操作
     */
    function _validateUserOp(UserOperation calldata userOp, UserOpInfo memory opInfo, uint256 opIndex) internal returns (uint256 validationData, uint256 pmValidationData) {
        opInfo.mUserOpHash = getUserOpHash(userOp);
        
        // 计算预付费
        uint256 requiredPrefund = _calculatePrefund(userOp);
        opInfo.prefund = requiredPrefund;
        
        // 验证账户
        address account = userOp.sender;
        uint256 preGas = gasleft();
        try IAccount(account).validateUserOp(userOp, opInfo.mUserOpHash, opInfo.prefund) returns (uint256 accountValidationData) {
            validationData = accountValidationData;
        } catch {
            revert FailedOp(opIndex, "AA23 reverted");
        }
        
        if (preGas - gasleft() > userOp.verificationGasLimit) {
            revert FailedOp(opIndex, "AA26 over verificationGasLimit");
        }
        
                 // 验证 paymaster（如果存在）
         address paymaster = userOp.getPaymaster();
         if (paymaster != address(0)) {
             preGas = gasleft();
             try IPaymaster(paymaster).validatePaymasterUserOp(userOp, opInfo.mUserOpHash, opInfo.prefund) returns (bytes memory context) {
                 pmValidationData = 0;
                 opInfo.context = context;
             } catch {
                 revert FailedOp(opIndex, "AA33 reverted");
             }
             
             if (preGas - gasleft() > userOp.verificationGasLimit) {
                 revert FailedOp(opIndex, "AA36 over verificationGasLimit");
             }
         }
    }

    /**
     * @dev 执行用户操作
     */
    function _executeUserOp(uint256 opIndex, UserOperation calldata userOp, UserOpInfo memory opInfo, UserOpInfo[] memory opInfos) internal {
        uint256 preGas = gasleft();
        bytes memory context = opInfo.context;
        
        try IAccount(userOp.sender).execute(userOp.target, userOp.value, userOp.data) {
            // 成功执行
        } catch {
            // 执行失败，但不抛出异常
        }
        
        uint256 actualGas = preGas - gasleft();
        uint256 actualGasCost = actualGas * tx.gasprice;
        
        // 如果有paymaster，调用postOp
        address paymaster = userOp.getPaymaster();
        if (paymaster != address(0)) {
            try IPaymaster(paymaster).postOp(IPaymaster.PostOpMode.opSucceeded, context, actualGasCost) {
                // postOp成功
            } catch {
                // postOp失败
            }
        }
        
        emit UserOperationEvent(opInfo.mUserOpHash, userOp.sender, paymaster, userOp.nonce, true, actualGasCost, actualGas);
    }

    /**
     * @dev 计算预付费
     */
    function _calculatePrefund(UserOperation calldata userOp) internal pure returns (uint256) {
        uint256 requiredGas = userOp.callGasLimit + userOp.verificationGasLimit + userOp.preVerificationGas;
        return requiredGas * getUserOpMaxGasPrice(userOp);
    }

    /**
     * @dev 获取用户操作的最大gas价格
     */
    function getUserOpMaxGasPrice(UserOperation calldata userOp) internal pure returns (uint256) {
        return userOp.maxFeePerGas;
    }

    /**
     * @dev 部署账户
     */
    function _deployAccount(UserOperation calldata userOp, bytes32 userOpHash) internal {
        if (userOp.initCode.length == 0) return;
        
        // 提取工厂地址和调用数据
        address factory = address(bytes20(userOp.initCode[:20]));
        bytes calldata callData = userOp.initCode[20:];
        
        // 调用工厂合约部署账户
        (bool success, ) = factory.call(callData);
        require(success, "AA13 initCode failed");
        
        emit AccountDeployed(userOpHash, userOp.sender, factory, userOp.getPaymaster());
    }

    /**
     * @dev 收取资金
     */
    function _chargeFunds(UserOperation calldata userOp, uint256 requiredPrefund) internal returns (uint256 missingAccountFunds) {
        address account = userOp.sender;
        uint256 accountBalance = this.balanceOf(account);
        
        if (accountBalance < requiredPrefund) {
            missingAccountFunds = requiredPrefund - accountBalance;
        }
        
        if (accountBalance > 0) {
            deposits[account].deposit -= accountBalance;
        }
    }

    /**
     * @dev 补偿打包者
     */
    function _compensate(address payable beneficiary) internal {
        // 向beneficiary转账剩余的gas费用
        if (beneficiary != address(0)) {
            (bool success, ) = beneficiary.call{value: address(this).balance}("");
            require(success, "Failed to transfer to beneficiary");
        }
    }

    /**
     * @dev 存款
     */
    function depositTo(address account) external payable {
        deposits[account].deposit += msg.value;
        emit Deposited(account, deposits[account].deposit);
    }

    /**
     * @dev 提取存款
     */
    function withdrawTo(address payable withdrawAddress, uint256 withdrawAmount) external {
        DepositInfo storage info = deposits[msg.sender];
        require(withdrawAmount <= info.deposit, "Insufficient deposit");
        
        info.deposit -= withdrawAmount;
        (bool success, ) = withdrawAddress.call{value: withdrawAmount}("");
        require(success, "Withdrawal failed");
        
        emit Withdrawn(msg.sender, withdrawAddress, withdrawAmount);
    }

    /**
     * @dev 添加质押
     */
    function addStake(uint32 unstakeDelaySec) external payable {
        DepositInfo storage info = deposits[msg.sender];
        require(unstakeDelaySec > 0, "must specify unstake delay");
        require(unstakeDelaySec >= MIN_UNSTAKE_DELAY, "unstake delay too low");
        require(unstakeDelaySec >= info.unstakeDelaySec, "cannot decrease unstake time");
        
        info.stake += uint112(msg.value);
        info.unstakeDelaySec = unstakeDelaySec;
        info.staked = true;
        
        emit StakeLocked(msg.sender, info.stake, unstakeDelaySec);
    }

    /**
     * @dev 解锁质押
     */
    function unlockStake() external {
        DepositInfo storage info = deposits[msg.sender];
        require(info.staked, "not staked");
        require(info.withdrawTime == 0, "already unlocking");
        
        info.withdrawTime = uint48(block.timestamp) + info.unstakeDelaySec;
        
        emit StakeUnlocked(msg.sender, info.withdrawTime);
    }

    /**
     * @dev 提取质押
     */
    function withdrawStake(address payable withdrawAddress) external {
        DepositInfo storage info = deposits[msg.sender];
        uint256 stake = info.stake;
        require(stake > 0, "No stake to withdraw");
        require(info.withdrawTime > 0, "must call unlockStake() first");
        require(info.withdrawTime <= block.timestamp, "Stake withdrawal is not due");
        
        info.stake = 0;
        info.withdrawTime = 0;
        info.staked = false;
        
        (bool success, ) = withdrawAddress.call{value: stake}("");
        require(success, "Stake withdrawal failed");
        
        emit StakeWithdrawn(msg.sender, withdrawAddress, stake);
    }

    /**
     * @dev 获取账户存款信息
     */
    function getDepositInfo(address account) external view returns (DepositInfo memory info) {
        return deposits[account];
    }

    /**
     * @dev 获取账户余额
     */
    function balanceOf(address account) external view returns (uint256) {
        return deposits[account].deposit;
    }

    /**
     * @dev 模拟验证用户操作
     */
    function simulateValidation(UserOperation calldata userOp) external {
        UserOpInfo memory opInfo;
        (uint256 validationData, uint256 pmValidationData) = _validateUserOp(userOp, opInfo, 0);
        
        // 计算返回信息
        IEntryPoint.ReturnInfo memory returnInfo = IEntryPoint.ReturnInfo({
            preOpGas: opInfo.preOpGas,
            prefund: opInfo.prefund,
            sigFailed: validationData != 0,
            validAfter: uint48(validationData >> 160),
            validUntil: uint48(validationData >> 208),
            paymasterContext: opInfo.context
        });
        
        // 计算质押信息
        IEntryPoint.StakeInfo memory senderInfo = getStakeInfo(userOp.sender);
        IEntryPoint.StakeInfo memory factoryInfo = getStakeInfo(userOp.getInitCodeFactory());
        IEntryPoint.StakeInfo memory paymasterInfo = getStakeInfo(userOp.getPaymaster());
        
        // 抛出验证结果
        revert ValidationResult(returnInfo, senderInfo, factoryInfo, paymasterInfo);
    }

    /**
     * @dev 获取用户操作哈希
     */
    function getUserOpHash(UserOperation calldata userOp) public view returns (bytes32) {
        return keccak256(abi.encode(
            userOp.hash(),
            address(this),
            block.chainid
        ));
    }

    /**
     * @dev 获取质押信息
     */
    function getStakeInfo(address account) public view returns (IEntryPoint.StakeInfo memory) {
        DepositInfo storage info = deposits[account];
        return IEntryPoint.StakeInfo({
            stake: info.stake,
            unstakeDelaySec: info.unstakeDelaySec
        });
    }

    /**
     * @dev 从初始化代码中获取发送者地址
     */
    function getSenderAddress(bytes calldata initCode) external {
        if (initCode.length < 20) {
            revert SenderAddressResult(address(0));
        }
        
        // 从initCode中提取工厂合约地址和构造函数参数
        address factory = address(bytes20(initCode[:20]));
        bytes calldata callData = initCode[20:];
        
        // 调用工厂合约
        (bool success, bytes memory result) = factory.call(callData);
        
        if (!success) {
            revert SenderAddressResult(address(0));
        }
        
        // 从返回结果中获取地址
        address sender = abi.decode(result, (address));
        revert SenderAddressResult(sender);
    }

    /**
     * @dev 接收 ETH
     */
    receive() external payable {
        this.depositTo(msg.sender);
    }

    /**
     * @dev 存款函数别名
     */
    function deposit() external payable {
        this.depositTo(msg.sender);
    }
} 