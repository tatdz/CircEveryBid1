//src/StepStorageReader.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IStepStorage} from "@uniswap/continuous-clearing-auction/interfaces/IStepStorage.sol";
import {AuctionStep, StepLib} from "@uniswap/continuous-clearing-auction/libraries/StepLib.sol";
import {SSTORE2} from "solady/utils/SSTORE2.sol";

contract StepStorageReader {
    
    /// @notice Read current step data from CCA
    function readCurrentSteps(address cca) public view returns (bytes memory stepsData) {
        IStepStorage stepStorage = IStepStorage(cca);
        
        // Get the pointer to SSTORE2 contract
        address pointer = stepStorage.pointer();
        require(pointer != address(0), "No steps pointer");
        
        // Read all steps data from SSTORE2
        stepsData = SSTORE2.read(pointer);
        
        require(stepsData.length > 0, "No steps data");
        require(stepsData.length % StepLib.UINT64_SIZE == 0, "Invalid steps data length");
        
        return stepsData;
    }
    
/// @notice Get first step data using StepLib
function decodeSteps(address cca) public view returns (AuctionStep[] memory steps) {
    bytes memory stepsData = readCurrentSteps(cca);
    
    // Just decode the first step using existing StepLib functionality
    uint256 numSteps = stepsData.length / 8;
    steps = new AuctionStep[](1); // Return first step only for simplicity
    
    (uint24 mps, uint40 blockDelta) = StepLib.get(stepsData, 0);
    
    steps[0] = AuctionStep({
        mps: mps,
        startBlock: uint64(block.number),
        endBlock: uint64(block.number + blockDelta)
    });
}


    
    /// @notice Get current MPS value
    function getCurrentMPS(address cca) public view returns (uint24) {
        IStepStorage stepStorage = IStepStorage(cca);
        AuctionStep memory step = stepStorage.step();
        return step.mps;
    }
    
    /// @notice Get step progress
    function getStepProgress(address cca) public view returns (
        uint24 mps,
        uint64 startBlock,
        uint64 endBlock,
        uint256 blocksRemaining,
        uint256 progressBps
    ) {
        IStepStorage stepStorage = IStepStorage(cca);
        AuctionStep memory step = stepStorage.step();
        
        mps = step.mps;
        startBlock = step.startBlock;
        endBlock = step.endBlock;
        
        if (block.number > endBlock) {
            blocksRemaining = 0;
            progressBps = 10000;
        } else {
            blocksRemaining = endBlock - uint64(block.number);
            progressBps = ((block.number - startBlock) * 10000) / (endBlock - startBlock);
        }
        
        return (mps, startBlock, endBlock, blocksRemaining, progressBps);
    }
    
    /// @notice Estimate tokens to be sold in current step
    function estimateCurrentStepTokens(address cca, uint256 totalSupply) public view returns (uint256) {
        (, uint64 startBlock, uint64 endBlock, , uint256 progressBps) = getStepProgress(cca);
        
        if (progressBps == 0) return 0;
        
        IStepStorage stepStorage = IStepStorage(cca);
        AuctionStep memory step = stepStorage.step();
        
        // Calculate tokens for this step
        uint256 stepDuration = endBlock - startBlock;
        uint256 stepMpsPerBlock = uint256(step.mps);
        
        // Total possible tokens for this step
        uint256 stepTotalTokens = (stepMpsPerBlock * stepDuration * totalSupply) / 1e7 / 100;
        
        // Prorate by step progress
        return (stepTotalTokens * progressBps) / 10000;
    }
}