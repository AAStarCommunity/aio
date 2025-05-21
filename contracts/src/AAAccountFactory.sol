// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";
import "./AAAccount.sol";

/**
 * @title AAAccountFactory
 * @dev 用于创建新的 AA 账户的工厂合约
 */
contract AAAccountFactory {
    AAAccount public immutable accountImplementation;
    
    event AccountCreated(address indexed account, address indexed owner, bytes32 indexed blsPublicKey);
    
    constructor(IEntryPoint entryPoint) {
        accountImplementation = new AAAccount(entryPoint);
    }
    
    /**
     * @dev 创建新的 AA 账户
     * @param owner 账户所有者地址
     * @param blsPublicKey BLS 公钥
     * @param salt 用于确定性地址生成的盐值
     * @return proxy 新创建的账户地址
     */
    function createAccount(address owner, bytes32 blsPublicKey, bytes32 salt) public returns (address proxy) {
        bytes memory initializeData = abi.encodeWithSelector(
            AAAccount.initialize.selector,
            owner,
            blsPublicKey
        );
        
        bytes32 deploySalt = keccak256(abi.encodePacked(salt, owner, blsPublicKey));
        proxy = address(new ERC1967Proxy{salt: deploySalt}(
            address(accountImplementation),
            initializeData
        ));
        
        emit AccountCreated(proxy, owner, blsPublicKey);
    }
    
    /**
     * @dev 计算账户地址（在创建之前）
     */
    function getAddress(address owner, bytes32 blsPublicKey, bytes32 salt) public view returns (address) {
        bytes32 deploySalt = keccak256(abi.encodePacked(salt, owner, blsPublicKey));
        bytes memory initializeData = abi.encodeWithSelector(
            AAAccount.initialize.selector,
            owner,
            blsPublicKey
        );
        
        bytes memory deploymentData = abi.encodePacked(
            type(ERC1967Proxy).creationCode,
            abi.encode(address(accountImplementation), initializeData)
        );
        
        bytes32 hash = keccak256(abi.encodePacked(
            bytes1(0xff),
            address(this),
            deploySalt,
            keccak256(deploymentData)
        ));
        
        return address(uint160(uint256(hash)));
    }
} 