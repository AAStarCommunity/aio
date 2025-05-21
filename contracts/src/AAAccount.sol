// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "./interfaces/IAccount.sol";
import "./interfaces/IEntryPoint.sol";

/**
 * @title AAAccount
 * @dev 实现账户抽象功能的智能合约
 */
contract AAAccount is IAccount, Initializable {
    using ECDSA for bytes32;

    address public owner;
    IEntryPoint private immutable _entryPoint;
    bytes32 public blsPublicKey;

    event AccountInitialized(address indexed owner, bytes32 indexed blsPublicKey);

    error NotEntryPoint();
    error NotOwner();
    error InvalidSignature();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(IEntryPoint entryPoint_) {
        _entryPoint = entryPoint_;
    }

    function initialize(address owner_, bytes32 blsPublicKey_) public initializer {
        owner = owner_;
        blsPublicKey = blsPublicKey_;
        emit AccountInitialized(owner_, blsPublicKey_);
    }

    function validateUserOp(UserOperation calldata userOp, bytes32 userOpHash, uint256 missingAccountFunds)
        external
        returns (uint256 validationData)
    {
        if (msg.sender != address(_entryPoint)) revert NotEntryPoint();
        
        // 验证 BLS 签名
        // TODO: 实现 BLS 签名验证逻辑
        
        // 如果需要，为 gas 费用添加资金
        if (missingAccountFunds > 0) {
            (bool success,) = payable(msg.sender).call{value: missingAccountFunds}("");
            require(success, "Failed to pay missing funds");
        }

        return 0; // 暂时返回0，表示验证成功
    }

    function execute(address dest, uint256 value, bytes calldata func) external {
        if (msg.sender != address(_entryPoint)) revert NotEntryPoint();
        _call(dest, value, func);
    }

    function executeBatch(address[] calldata dest, uint256[] calldata value, bytes[] calldata func) external {
        if (msg.sender != address(_entryPoint)) revert NotEntryPoint();
        require(dest.length == func.length && value.length == func.length, "Invalid batch parameters");
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], value[i], func[i]);
        }
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    receive() external payable {}
} 