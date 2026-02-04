//contracts/src/libraries/DynamicMPS.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {AuctionStep, StepLib} from "@uniswap/continuous-clearing-auction/libraries/StepLib.sol";
import {FixedPointMathLib} from "solady/utils/FixedPointMathLib.sol";

library DynamicMPS {
    using FixedPointMathLib for uint256;
    
    function decodeSteps(bytes memory stepsData) internal pure returns (AuctionStep[] memory steps) {
        require(stepsData.length % 8 == 0, "Invalid steps data length");
        uint256 numSteps = stepsData.length / 8;
        steps = new AuctionStep[](numSteps);
        
        for (uint256 i = 0; i < numSteps; i++) {
            uint256 offset = i * 8;
            (uint24 mps, uint40 blockDelta) = StepLib.get(stepsData, offset);
            
            steps[i].mps = mps;
            steps[i].startBlock = uint64(i > 0 ? steps[i-1].endBlock : 0);
            steps[i].endBlock = steps[i].startBlock + uint64(blockDelta);
        }
    }
    
    function encodeSteps(AuctionStep[] memory steps) internal pure returns (bytes memory) {
        bytes memory encoded = new bytes(steps.length * 8);
        
        uint64 currentBlock = 0;
        for (uint256 i = 0; i < steps.length; i++) {
            uint40 blockDelta = uint40(steps[i].endBlock - currentBlock);
            bytes8 packed = bytes8((uint64(steps[i].mps) << 40) | uint64(blockDelta));
            assembly {
                mstore(add(encoded, add(32, mul(i, 8))), packed)
            }
            currentBlock = steps[i].endBlock;
        }
        return encoded;
    }
    
    function calculateOptimalSteps(
        bytes memory currentStepsData,
        uint256 priceDiscoveryProgress,
        uint256 bidConcentrationHHI,
        uint256 pythPriceDeviation,
        uint256 blocksElapsed,
        uint256 totalBlocks
    ) internal pure returns (bytes memory) {
        AuctionStep[] memory currentSteps = decodeSteps(currentStepsData);
        AuctionStep[] memory newSteps = new AuctionStep[](currentSteps.length);
        
        uint256 optimizationFactor = calculateOptimizationFactor(
            priceDiscoveryProgress,
            bidConcentrationHHI,
            pythPriceDeviation,
            blocksElapsed,
            totalBlocks
        );
        
        for (uint256 i = 0; i < currentSteps.length; i++) {
            newSteps[i] = currentSteps[i];
            
            uint256 newMPS = (uint256(currentSteps[i].mps) * optimizationFactor) / 100;
            
            uint256 minMPS = (uint256(currentSteps[i].mps) * 50) / 100;
            uint256 maxMPS = uint256(currentSteps[i].mps) * 2;
            
            if (newMPS < minMPS) newMPS = minMPS;
            if (newMPS > maxMPS) newMPS = maxMPS;
            if (newMPS > type(uint24).max) newMPS = type(uint24).max;
            
            newSteps[i].mps = uint24(newMPS);
            
            if (optimizationFactor > 150) {
                uint64 blockReduction = uint64(
                    (uint256(currentSteps[i].endBlock - currentSteps[i].startBlock) * 20) / 100
                );
                newSteps[i].endBlock = currentSteps[i].endBlock - blockReduction;
            } else if (optimizationFactor < 70) {
                uint64 blockIncrease = uint64(
                    (uint256(currentSteps[i].endBlock - currentSteps[i].startBlock) * 30) / 100
                );
                newSteps[i].endBlock = currentSteps[i].endBlock + blockIncrease;
            }
        }
        
        return encodeSteps(newSteps);
    }
    
    function calculateOptimizationFactor(
        uint256 priceDiscoveryProgress,
        uint256 bidConcentrationHHI,
        uint256 pythPriceDeviation,
        uint256 blocksElapsed,
        uint256 totalBlocks
    ) internal pure returns (uint256) {
        uint256 factor = 100;
        
        if (priceDiscoveryProgress < 300) {
            uint256 acceleration = ((300 - priceDiscoveryProgress) * 30) / 300;
            factor += acceleration;
        } else if (priceDiscoveryProgress > 700) {
            factor = (factor * 85) / 100;
        }
        
        if (bidConcentrationHHI > 2500) {
            uint256 concentrationPenalty = ((bidConcentrationHHI - 2500) * 20) / 100;
            if (concentrationPenalty > 40) concentrationPenalty = 40;
            factor = (factor * (100 - concentrationPenalty)) / 100;
        } else if (bidConcentrationHHI < 800) {
            uint256 fragmentationBonus = ((800 - bidConcentrationHHI) * 10) / 800;
            if (fragmentationBonus > 20) fragmentationBonus = 20;
            factor += fragmentationBonus;
        }
        
        if (pythPriceDeviation > 150) {
            factor = (factor * 50) / 100;
        }
        
        uint256 timeRemaining = totalBlocks - blocksElapsed;
        if (totalBlocks > 0) {
            uint256 timeProgress = (timeRemaining * 100) / totalBlocks;
            
            if (timeProgress > 70) {
                factor = (factor * 110) / 100;
            } else if (timeProgress < 30) {
                factor = (factor * 90) / 100;
            }
        }
        
        if (factor < 50) factor = 50;
        if (factor > 200) factor = 200;
        
        return factor;
    }
    
    function calculateExpectedImprovement(
        bytes memory oldSteps,
        bytes memory newSteps,
        uint256 priceDiscoveryProgress,
        uint256 bidConcentrationHHI
    ) internal pure returns (uint256) {
        AuctionStep[] memory oldStepsArray = decodeSteps(oldSteps);
        AuctionStep[] memory newStepsArray = decodeSteps(newSteps);
        
        uint256 totalMPSChange = 0;
        
        for (uint256 i = 0; i < oldStepsArray.length && i < newStepsArray.length; i++) {
            int256 change = int256(uint256(newStepsArray[i].mps)) - int256(uint256(oldStepsArray[i].mps));
            totalMPSChange += uint256(change > 0 ? change : -change);
        }
        
        uint256 avgChange = oldStepsArray.length > 0 ? (totalMPSChange * 100) / oldStepsArray.length : 0;
        
        uint256 weight = 100;
        if (priceDiscoveryProgress < 400) weight += 20;
        if (bidConcentrationHHI > 2500) weight += 15;
        
        return (avgChange * weight) / 100;
    }
}
