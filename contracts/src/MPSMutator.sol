//src/MPSMutator.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IContinuousClearingAuction} from "@uniswap/continuous-clearing-auction/interfaces/IContinuousClearingAuction.sol";
import {StepStorageReader} from "./StepStorageReader.sol";
import {IPyth} from "@pyth-sdk-solidity/IPyth.sol";
import {PythStructs} from "@pyth-sdk-solidity/PythStructs.sol";
import {IStepStorage} from "@uniswap/continuous-clearing-auction/interfaces/IStepStorage.sol";
import {StepLib} from "@uniswap/continuous-clearing-auction/libraries/StepLib.sol";
import {AuctionStep} from "@uniswap/continuous-clearing-auction/libraries/StepLib.sol";

contract MPSMutator {
    
    struct OptimizationProof {
        uint256 proofId;
        address cca;
        bytes32 stepsHash;
        uint256 improvementBps;
        uint256 timestamp;
        bytes32 priceFeedId;
        uint256 pythPrice;
        uint256 bidConcentration;
        uint256 priceDiscoveryProgress;
        uint256 marketEfficiency;
        address optimizer;
    }
    
    struct AuctionMetrics {
        uint256 priceDiscoveryProgress;
        uint256 bidConcentration;
        uint256 pythDeviation;
        uint256 marketEfficiency;
        uint256 auctionProgress;
        uint256 clearingPrice;
        uint256 currencyRaised;
        uint256 totalBids;
        uint256 crossChainBidCount;
    }
    
    IPyth public immutable pyth;
    StepStorageReader public immutable stepReader;
    
    mapping(address => bytes32) public latestOptimizationHash;
    mapping(bytes32 => OptimizationProof) public proofs;
    mapping(address => uint256) public optimizationCount;
    mapping(address => AuctionMetrics) public lastMetrics;
    
    uint256 public proofCounter;
    
    // Configuration parameters
    uint256 public constant PROGRESS_THRESHOLD_LOW = 400;
    uint256 public constant PROGRESS_THRESHOLD_HIGH = 800;
    uint256 public constant HHI_THRESHOLD = 2500;
    uint256 public constant PYTH_DEVIATION_THRESHOLD = 1500;
    uint256 public constant MAX_FACTOR_CHANGE = 50;
    uint256 public constant MIN_FACTOR = 50;
    uint256 public constant MAX_FACTOR = 200;
    
    event OptimizationProved(
        uint256 indexed proofId,
        address indexed cca,
        bytes32 stepsHash,
        uint256 improvementBps,
        uint256 timestamp
    );
    
    event AuctionMetricsCalculated(
        address indexed cca,
        uint256 priceDiscoveryProgress,
        uint256 bidConcentration,
        uint256 pythDeviation,
        uint256 marketEfficiency,
        uint256 optimizationFactor
    );
    
    constructor(address _pyth, address _stepReader) {
        require(_pyth != address(0), "Invalid Pyth address");
        require(_stepReader != address(0), "Invalid step reader address");
        
        pyth = IPyth(_pyth);
        stepReader = StepStorageReader(_stepReader);
    }
    
    function optimizeAndProve(
        address cca,
        bytes[] calldata priceUpdateData,
        bytes32 priceFeedId,
        uint256 bidConcentration,
        uint256 crossChainBidCount,
        string calldata clientRef
    ) external payable returns (
        uint256 proofId,
        bytes32 stepsHash,
        uint256 improvementBps,
        bytes memory optimizedSteps
    ) {
        // 1. Pay for REAL Pyth data update
        uint256 fee = pyth.getUpdateFee(priceUpdateData);
        require(msg.value >= fee, "Insufficient fee");
        
        // Validate price update data
        require(priceUpdateData.length > 0, "No price update data");
        for (uint i = 0; i < priceUpdateData.length; i++) {
            require(priceUpdateData[i].length > 0, "Empty price update data");
        }
        
        // Update Pyth with the provided data
        pyth.updatePriceFeeds{value: fee}(priceUpdateData);
        
        // 2. Read current auction state
        IContinuousClearingAuction auction = IContinuousClearingAuction(cca);
        
        uint256 currentPrice = auction.clearingPrice();
        uint256 currencyRaised = auction.currencyRaised();
        uint64 startBlock = auction.startBlock();
        uint64 endBlock = auction.endBlock();
        uint256 totalSupply = auction.totalSupply();
        
        require(block.number < endBlock, "Auction has ended");
        require(currentPrice > 0, "Invalid auction price");
        
        // 3. Get REAL Pyth price
        uint256 pythPrice = _getPythPrice(priceFeedId);
        require(pythPrice > 0, "Invalid Pyth price");
        
        // 4. Calculate auction metrics
        AuctionMetrics memory metrics = _calculateAuctionMetrics(
            cca,
            currentPrice,
            currencyRaised,
            totalSupply,
            startBlock,
            endBlock,
            pythPrice,
            bidConcentration,
            crossChainBidCount
        );
        
        lastMetrics[cca] = metrics;
        
        // 5. Calculate optimization factor
        uint256 optimizationFactor = _calculateOptimizationFactor(metrics);
        
        // 6. Read current steps
        bytes memory currentSteps = stepReader.readCurrentSteps(cca);
        require(currentSteps.length > 0, "No current steps");
        
        // 7. Calculate optimized steps
        optimizedSteps = _mutateSteps(currentSteps, optimizationFactor, startBlock, endBlock);
        
        require(optimizedSteps.length > 0, "Optimization failed");
        
        // 8. Calculate improvement
        improvementBps = _calculateExpectedImprovement(currentSteps, optimizedSteps, metrics);
        
        // 9. Create proof
        proofId = ++proofCounter;
        stepsHash = keccak256(optimizedSteps);
        
        bytes32 proofHash = keccak256(abi.encodePacked(
            cca,
            stepsHash,
            improvementBps,
            block.timestamp,
            clientRef
        ));
        
        proofs[proofHash] = OptimizationProof({
            proofId: proofId,
            cca: cca,
            stepsHash: stepsHash,
            improvementBps: improvementBps,
            timestamp: block.timestamp,
            priceFeedId: priceFeedId,
            pythPrice: pythPrice,
            bidConcentration: metrics.bidConcentration,
            priceDiscoveryProgress: metrics.priceDiscoveryProgress,
            marketEfficiency: metrics.marketEfficiency,
            optimizer: msg.sender
        });
        
        latestOptimizationHash[cca] = proofHash;
        optimizationCount[cca]++;
        
        emit OptimizationProved(proofId, cca, stepsHash, improvementBps, block.timestamp);
        emit AuctionMetricsCalculated(
            cca,
            metrics.priceDiscoveryProgress,
            metrics.bidConcentration,
            metrics.pythDeviation,
            metrics.marketEfficiency,
            optimizationFactor
        );
        
        // Refund excess ETH
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
    }
    
    function _calculateAuctionMetrics(
        address cca,
        uint256 clearingPrice,
        uint256 currencyRaised,
        uint256 totalSupply,
        uint64 startBlock,
        uint64 endBlock,
        uint256 pythPrice,
        uint256 bidConcentration,
        uint256 crossChainBidCount
    ) internal view returns (AuctionMetrics memory) {
        AuctionMetrics memory metrics;
        
        // Price discovery progress
        uint256 potentialRevenue = (clearingPrice * totalSupply) >> 96;
        if (potentialRevenue > 0) {
            metrics.priceDiscoveryProgress = (currencyRaised * 1000) / potentialRevenue;
        } else {
            metrics.priceDiscoveryProgress = 0;
        }
        
        // Bid concentration (adjusted for cross-chain participation)
        if (crossChainBidCount > 0) {
            metrics.bidConcentration = bidConcentration * 100 / (100 + crossChainBidCount);
        } else {
            metrics.bidConcentration = bidConcentration;
        }
        
        // Pyth price deviation
        if (pythPrice > 0 && clearingPrice > 0) {
            uint256 auctionPriceInUSD = _convertToUSD(clearingPrice, pythPrice);
            if (auctionPriceInUSD > pythPrice) {
                metrics.pythDeviation = ((auctionPriceInUSD - pythPrice) * 10000) / pythPrice;
            } else {
                metrics.pythDeviation = ((pythPrice - auctionPriceInUSD) * 10000) / pythPrice;
            }
        } else {
            metrics.pythDeviation = 0;
        }
        
        // Market efficiency (better with cross-chain participation)
        if (metrics.bidConcentration > 0) {
            metrics.marketEfficiency = 10000 / metrics.bidConcentration;
            if (crossChainBidCount > 0) {
                metrics.marketEfficiency = metrics.marketEfficiency * (100 + crossChainBidCount) / 100;
            }
            if (metrics.marketEfficiency > 100) metrics.marketEfficiency = 100;
        } else {
            metrics.marketEfficiency = 100;
        }
        
        // Auction progress
        if (block.number <= startBlock) {
            metrics.auctionProgress = 0;
        } else if (block.number >= endBlock) {
            metrics.auctionProgress = 10000;
        } else {
            metrics.auctionProgress = ((block.number - startBlock) * 10000) / (endBlock - startBlock);
        }
        
        metrics.clearingPrice = clearingPrice;
        metrics.currencyRaised = currencyRaised;
        metrics.crossChainBidCount = crossChainBidCount;
        
        return metrics;
    }
    
    function _calculateOptimizationFactor(AuctionMetrics memory metrics) internal pure returns (uint256) {
        uint256 factor = 100;
        
        // Rule 1: Accelerate slow price discovery
        if (metrics.priceDiscoveryProgress < PROGRESS_THRESHOLD_LOW) {
            factor += 30;
        }
        
        // Rule 2: Decelerate overheated discovery
        if (metrics.priceDiscoveryProgress > PROGRESS_THRESHOLD_HIGH) {
            factor = (factor * 85) / 100;
        }
        
        // Rule 3: Reduce issuance for high concentration
        if (metrics.bidConcentration > HHI_THRESHOLD) {
            uint256 concentrationPenalty = (metrics.bidConcentration - HHI_THRESHOLD) / 100;
            if (concentrationPenalty > 0) {
                factor = (factor * (100 - concentrationPenalty)) / 100;
            }
        }
        
        // Rule 4: Severe deviation throttling
        if (metrics.pythDeviation > PYTH_DEVIATION_THRESHOLD) {
            factor = MIN_FACTOR;
        }
        
        // Rule 5: Adjust for market efficiency
        uint256 efficiencyAdjustment = (metrics.marketEfficiency * MAX_FACTOR_CHANGE) / 100;
        factor = (factor * (100 + efficiencyAdjustment / 2)) / 100;
        
        // Rule 6: Boost for cross-chain participation
        if (metrics.crossChainBidCount > 0) {
            factor = factor * (100 + metrics.crossChainBidCount) / 100;
        }
        
        // Apply bounds
        if (factor < MIN_FACTOR) factor = MIN_FACTOR;
        if (factor > MAX_FACTOR) factor = MAX_FACTOR;
        
        return factor;
    }
    
    function _mutateSteps(
        bytes memory currentSteps,
        uint256 optimizationFactor,
        uint64 startBlock,
        uint64 endBlock
    ) internal view returns (bytes memory) {
        uint256 numSteps = currentSteps.length / StepLib.UINT64_SIZE;
        
        bytes memory newSteps = new bytes(numSteps * StepLib.UINT64_SIZE);
        
        uint64 currentStartBlock = startBlock;
        
        for (uint256 i = 0; i < numSteps; i++) {
            uint256 offset = i * StepLib.UINT64_SIZE;
            
            (uint24 mps, uint40 blockDelta) = StepLib.get(currentSteps, offset);
            
            uint64 stepStartBlock = currentStartBlock;
            uint64 stepEndBlock = stepStartBlock + uint64(blockDelta);
            
            uint24 newMps = mps;
            if (block.number < stepEndBlock) {
                newMps = uint24((uint256(mps) * optimizationFactor) / 100);
                
                if (newMps < 100) newMps = 100;
            }
            
            bytes8 encodedStep = _encodeStep(newMps, blockDelta);
            
            assembly {
                mstore(add(add(newSteps, 0x20), offset), encodedStep)
            }
            
            currentStartBlock = stepEndBlock;
        }
        
        return newSteps;
    }
    
    function _encodeStep(uint24 mps, uint40 blockDelta) internal pure returns (bytes8) {
        uint64 packed = (uint64(mps) << 40) | uint64(blockDelta);
        return bytes8(packed);
    }
    
    function _calculateExpectedImprovement(
        bytes memory currentSteps,
        bytes memory optimizedSteps,
        AuctionMetrics memory metrics
    ) internal pure returns (uint256) {
        uint256 improvement = 0;
        
        if (metrics.priceDiscoveryProgress < 500) {
            improvement += (500 - metrics.priceDiscoveryProgress) / 25;
        }
        
        if (metrics.bidConcentration > HHI_THRESHOLD) {
            improvement += ((metrics.bidConcentration - HHI_THRESHOLD) * 150) / 10000;
        }
        
        if (metrics.pythDeviation > 500) {
            improvement += (metrics.pythDeviation - 500) / 50;
        }
        
        if (metrics.crossChainBidCount > 0) {
            improvement += metrics.crossChainBidCount * 10;
        }
        
        if (improvement > 500) improvement = 500;
        
        return improvement;
    }
    
    function getCurrentPythPrice(bytes32 feedId) external view returns (uint256) {
        return _getPythPrice(feedId);
    }
    
    function verifyProof(
        address cca,
        bytes32 stepsHash,
        uint256 improvementBps,
        uint256 timestamp,
        string calldata clientRef
    ) external view returns (bool) {
        bytes32 proofHash = keccak256(abi.encodePacked(
            cca,
            stepsHash,
            improvementBps,
            timestamp,
            clientRef
        ));
        
        return proofs[proofHash].proofId > 0;
    }
    
    function getLatestOptimization(address cca) 
        external 
        view 
        returns (
            bytes32 stepsHash,
            uint256 improvementBps,
            uint256 timestamp
        ) 
    {
        bytes32 proofHash = latestOptimizationHash[cca];
        if (proofHash == bytes32(0)) {
            return (bytes32(0), 0, 0);
        }
        
        OptimizationProof memory proof = proofs[proofHash];
        return (proof.stepsHash, proof.improvementBps, proof.timestamp);
    }
    
    function getLastMetrics(address cca) 
        external 
        view 
        returns (
            uint256 priceDiscoveryProgress,
            uint256 bidConcentration,
            uint256 pythDeviation,
            uint256 marketEfficiency,
            uint256 auctionProgress,
            uint256 clearingPrice,
            uint256 currencyRaised,
            uint256 crossChainBidCount
        ) 
    {
        AuctionMetrics memory metrics = lastMetrics[cca];
        return (
            metrics.priceDiscoveryProgress,
            metrics.bidConcentration,
            metrics.pythDeviation,
            metrics.marketEfficiency,
            metrics.auctionProgress,
            metrics.clearingPrice,
            metrics.currencyRaised,
            metrics.crossChainBidCount
        );
    }
    
    function _getPythPrice(bytes32 feedId) internal view returns (uint256) {
        PythStructs.Price memory price = pyth.getPriceNoOlderThan(feedId, 60);
        return _normalizePrice(price);
    }
    
    function _normalizePrice(PythStructs.Price memory price) internal pure returns (uint256) {
        if (price.expo >= 0) {
            return uint256(uint64(price.price)) * (10 ** uint256(int256(price.expo) + 18));
        } else {
            return uint256(uint64(price.price)) * (10 ** uint256(18 + int256(price.expo)));
        }
    }
    
    function _convertToUSD(uint256 auctionPrice, uint256 pythPrice) internal pure returns (uint256) {
        uint256 ethValue = auctionPrice / (2 ** 96);
        return (ethValue * pythPrice) / (10 ** 18);
    }
    
    function recoverETH() external {
        payable(msg.sender).transfer(address(this).balance);
    }
}