// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/BLSNodeRegistry.sol";

contract DeployBLSNodeRegistry is Script {
    function run() external {
        // 获取部署私钥
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployerAddress = vm.addr(deployerPrivateKey);
        
        // 根据环境选择 RPC URL
        string memory rpcUrl = vm.envBool("IS_LOCAL") ? vm.envString("LOCAL_RPC_URL") : vm.envString("RPC_URL");
        
        // 开始广播交易
        vm.startBroadcast(deployerPrivateKey);

        // 部署合约，将部署者设为初始所有者
        BLSNodeRegistry registry = new BLSNodeRegistry(deployerAddress);
        
        // 打印部署信息
        console.log("Using RPC URL:", rpcUrl);
        console.log("Deployer address:", deployerAddress);
        console.log("BLSNodeRegistry deployed to:", address(registry));

        vm.stopBroadcast();
    }
} 