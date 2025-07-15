// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "forge-std/Script.sol";
import "../src/AAAccountFactory.sol";
import "../src/paymaster/AAPaymaster.sol";
import "@account-abstraction/contracts/interfaces/IEntryPoint.sol";

contract DeploySimpleContracts is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address entryPointAddress = 0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789;
        
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy AAAccountFactory
        AAAccountFactory factory = new AAAccountFactory(IEntryPoint(entryPointAddress));
        console.log("AAAccountFactory deployed at:", address(factory));
        
        // Deploy AAPaymaster
        AAPaymaster paymaster = new AAPaymaster(IEntryPoint(entryPointAddress));
        console.log("AAPaymaster deployed at:", address(paymaster));
        
        // Skip paymaster funding for now
        console.log("Paymaster deployment complete");
        
        // Create a test account
        bytes memory testBlsPublicKey = hex"1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        address testAccount = factory.createAccount(
            address(0x1234567890123456789012345678901234567890), 
            testBlsPublicKey, 
            bytes32(0)
        );
        console.log("Test account created at:", testAccount);
        
        vm.stopBroadcast();
    }
} 