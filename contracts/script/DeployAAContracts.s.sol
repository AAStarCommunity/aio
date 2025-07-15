// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "@account-abstraction/contracts/core/EntryPoint.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";
import "@account-abstraction/contracts/interfaces/IPaymaster.sol";
import "../src/AAAccount.sol";
import "../src/AAAccountFactory.sol";
import "../src/paymaster/AAPaymaster.sol";

/**
 * @title DeployAAContracts
 * @dev 部署AAStar项目所需的全部智能合约
 */
contract DeployAAContracts is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. 部署标准EntryPoint合约
        EntryPoint entryPoint = new EntryPoint();
        console.log("Standard EntryPoint deployed at: ", address(entryPoint));
        
        // 2. 部署AAAccountFactory
        AAAccountFactory accountFactory = new AAAccountFactory(entryPoint);
        console.log("AAAccountFactory deployed at: ", address(accountFactory));
        
        // 3. 部署AAPaymaster
        AAPaymaster paymaster = new AAPaymaster(entryPoint);
        console.log("AAPaymaster deployed at: ", address(paymaster));
        
        // 4. 为Paymaster存入初始资金（1 ETH）
        entryPoint.depositTo{value: 1 ether}(address(paymaster));
        console.log("Funded EntryPoint with 1 ETH for paymaster");
        
        // 5. 创建一个测试账户，用于验证部署是否成功
        bytes memory blsPublicKey = new bytes(48);
        // 生成一个示例公钥，实际项目中应该使用真实的BLS公钥
        for (uint8 i = 0; i < 48; i++) {
            blsPublicKey[i] = bytes1(i);
        }
        
        address testAccount = accountFactory.createAccount(
            vm.addr(deployerPrivateKey), // 使用部署者作为测试账户的所有者
            blsPublicKey,
            bytes32(uint256(123)) // 示例salt
        );
        console.log("Test account created at: ", testAccount);
        
        vm.stopBroadcast();
    }
}

/**
 * @title TestDeployment
 * @dev 测试已部署合约的基本功能
 */
contract TestDeployment is Script {
    // 您需要提供已部署合约的地址
    address constant ENTRY_POINT_ADDRESS = address(0); // 替换为实际部署地址
    address constant FACTORY_ADDRESS = address(0); // 替换为实际部署地址
    address constant PAYMASTER_ADDRESS = address(0); // 替换为实际部署地址
    address constant TEST_ACCOUNT_ADDRESS = address(0); // 替换为实际部署地址
    
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        // 加载已部署的合约
        address payable entryPointAddr = payable(ENTRY_POINT_ADDRESS);
        address payable paymasterAddr = payable(PAYMASTER_ADDRESS);
        address payable testAccountAddr = payable(TEST_ACCOUNT_ADDRESS);

        EntryPoint entryPoint = EntryPoint(entryPointAddr);
        AAAccountFactory factory = AAAccountFactory(FACTORY_ADDRESS);
        AAPaymaster paymaster = AAPaymaster(paymasterAddr);
        AAAccount testAccount = AAAccount(testAccountAddr);
        
        // 测试账户的基本功能
        console.log("Test account owner: ", testAccount.owner());
        console.log("Test account is in testing mode: ", testAccount.isTesting());
        
        // 测试Paymaster功能
        console.log("Paymaster balance in EntryPoint: ", address(entryPoint).balance);
        
        vm.stopBroadcast();
    }
} 