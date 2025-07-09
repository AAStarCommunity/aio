// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "@account-abstraction/contracts/core/EntryPoint.sol";

contract DeployStandardEntryPoint is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy standard EntryPoint contract
        EntryPoint entryPoint = new EntryPoint();
        console.log("Standard EntryPoint deployed at:", address(entryPoint));
        
        vm.stopBroadcast();
        
        // Output deployment info
        console.log("=== Deployment Complete ===");
        console.log("Standard EntryPoint:", address(entryPoint));
        console.log("Please update ENTRY_POINT_ADDRESS in .env files");
    }
} 