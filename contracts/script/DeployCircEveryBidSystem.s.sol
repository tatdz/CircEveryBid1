// scripts/DeployCircEveryBidSystem.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Script, console2} from "forge-std/Script.sol";
import {CircEveryBidHook} from "../src/CircEveryBidHook.sol";
import {PoseidonBidCommitment} from "../src/PoseidonBidCommitment.sol";
import {MPSMutator} from "../src/MPSMutator.sol";
import {CircEveryBidOptimizer} from "../src/CircEveryBidOptimizer.sol";
import {CircEveryBidENSPerformanceRegistrar} from "../src/CircEveryBidENSPerformanceRegistrar.sol";
import {StepStorageReader} from "../src/StepStorageReader.sol";

contract DeployCircEveryBidSystem is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        
        // Load configuration
        address pyth = vm.envAddress("PYTH_ADDRESS");
        address ensRegistry = vm.envAddress("ENS_REGISTRY_ADDRESS");
        address ensPublicResolver = vm.envAddress("ENS_PUBLIC_RESOLVER");
        string memory ensDomain = vm.envString("ENS_DOMAIN");
        bytes32 ensParentNode = vm.envBytes32("ENS_PARENT_NODE");
        
        console2.log("Deploying CircEveryBid System with CCTP & Pyth...");
        console2.log("Deployer:", deployer);
        console2.log("ENS Registry:", ensRegistry);
        console2.log("Pyth Address:", pyth);
        
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy StepStorageReader
        StepStorageReader stepReader = new StepStorageReader();
        console2.log("StepStorageReader deployed:", address(stepReader));
        
        // 2. Deploy MPSMutator
        MPSMutator mutator = new MPSMutator(pyth, address(stepReader));
        console2.log("MPSMutator deployed:", address(mutator));
        
        // 3. Deploy Optimizer
        CircEveryBidOptimizer optimizer = new CircEveryBidOptimizer(
            address(stepReader),
            address(mutator),
            deployer
        );
        console2.log("CircEveryBidOptimizer deployed:", address(optimizer));
        
        // 4. Deploy Poseidon Bid Commitment
        PoseidonBidCommitment bidCommitment = new PoseidonBidCommitment();
        console2.log("PoseidonBidCommitment deployed:", address(bidCommitment));
        
        // 5. Deploy ENS Performance Registrar
        CircEveryBidENSPerformanceRegistrar ensRegistrar = new CircEveryBidENSPerformanceRegistrar(
            ensRegistry,
            ensPublicResolver,
            ensDomain,
            ensParentNode
        );
        console2.log("ENS Performance Registrar deployed:", address(ensRegistrar));
        
        // 6. Deploy Main Hook Contract with Pyth
        CircEveryBidHook hook = new CircEveryBidHook(
            address(bidCommitment),
            address(optimizer),
            address(ensRegistrar),
            ensRegistry,
            pyth,
            deployer
        );
        console2.log("CircEveryBidHook deployed:", address(hook));
        
        // 7. Setup permissions
        ensRegistrar.transferOwnership(address(hook));
        
        vm.stopBroadcast();
        
        console2.log("\n=== Deployment Complete ===");
        console2.log("Main Hook Contract:", address(hook));
        console2.log("Poseidon Commitment:", address(bidCommitment));
        console2.log("Optimizer:", address(optimizer));
        console2.log("MPS Mutator:", address(mutator));
        console2.log("ENS Registrar:", address(ensRegistrar));
        console2.log("Step Reader:", address(stepReader));
    }
}