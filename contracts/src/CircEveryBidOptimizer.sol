//src/CircEveryBidOptimizer.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {MPSMutator} from "./MPSMutator.sol";
import {StepStorageReader} from "./StepStorageReader.sol";

interface ICircEveryBidOptimizer {
    function createOptimizationJob(address auction) external returns (uint256 jobId);
    function executeOptimization(
        uint256 jobId,
        bytes[] calldata priceUpdateData,
        bytes32 priceFeedId,
        uint256 bidConcentration,
        uint256 crossChainBidCount,
        string calldata clientRef
    ) external payable returns (
        uint256 proofId,
        bytes32 stepsHash,
        uint256 improvementBps
    );
    function getOptimizationResult(uint256 jobId) external view returns (
        address auction,
        bytes32 stepsHash,
        uint256 improvementBps,
        uint256 timestamp
    );
}

contract CircEveryBidOptimizer is Ownable, ICircEveryBidOptimizer {
    
    struct OptimizationJob {
        uint256 jobId;
        address auction;
        address creator;
        uint256 createdTime;
        bool completed;
        bytes32 stepsHash;
        uint256 improvementBps;
        uint256 completionTime;
    }
    
    MPSMutator public immutable mutator;
    StepStorageReader public immutable stepReader;
    
    uint256 public jobCounter;
    mapping(uint256 => OptimizationJob) public jobs;
    mapping(address => uint256[]) public auctionJobs;
    
    event OptimizationJobCreated(
        uint256 indexed jobId,
        address indexed auction,
        address indexed creator,
        uint256 timestamp
    );
    
    event OptimizationJobCompleted(
        uint256 indexed jobId,
        address indexed auction,
        bytes32 stepsHash,
        uint256 improvementBps,
        uint256 timestamp
    );
    
    constructor(
        address _stepReader,
        address _mutator,
        address initialOwner
    ) Ownable(initialOwner) {
        stepReader = StepStorageReader(_stepReader);
        mutator = MPSMutator(_mutator);
    }
    
    function createOptimizationJob(address auction) external override returns (uint256 jobId) {
        require(auction != address(0), "Invalid auction address");
        
        jobId = ++jobCounter;
        
        jobs[jobId] = OptimizationJob({
            jobId: jobId,
            auction: auction,
            creator: msg.sender,
            createdTime: block.timestamp,
            completed: false,
            stepsHash: bytes32(0),
            improvementBps: 0,
            completionTime: 0
        });
        
        auctionJobs[auction].push(jobId);
        
        emit OptimizationJobCreated(jobId, auction, msg.sender, block.timestamp);
        
        return jobId;
    }
    
    function executeOptimization(
        uint256 jobId,
        bytes[] calldata priceUpdateData,
        bytes32 priceFeedId,
        uint256 bidConcentration,
        uint256 crossChainBidCount,
        string calldata clientRef
    ) external payable override returns (
        uint256 proofId,
        bytes32 stepsHash,
        uint256 improvementBps
    ) {
        OptimizationJob storage job = jobs[jobId];
        require(job.auction != address(0), "Invalid job");
        require(!job.completed, "Job already completed");
        
        (proofId, stepsHash, improvementBps, ) = mutator.optimizeAndProve{value: msg.value}(
            job.auction,
            priceUpdateData,
            priceFeedId,
            bidConcentration,
            crossChainBidCount,
            clientRef
        );
        
        job.completed = true;
        job.stepsHash = stepsHash;
        job.improvementBps = improvementBps;
        job.completionTime = block.timestamp;
        
        emit OptimizationJobCompleted(jobId, job.auction, stepsHash, improvementBps, block.timestamp);
        
        return (proofId, stepsHash, improvementBps);
    }
    
    function getOptimizationResult(uint256 jobId) external view override returns (
        address auction,
        bytes32 stepsHash,
        uint256 improvementBps,
        uint256 timestamp
    ) {
        OptimizationJob memory job = jobs[jobId];
        return (job.auction, job.stepsHash, job.improvementBps, job.completionTime);
    }
    
    function getAuctionJobs(address auction) external view returns (uint256[] memory) {
        return auctionJobs[auction];
    }
    
    function getJobDetails(uint256 jobId) external view returns (
        address auction,
        address creator,
        uint256 createdTime,
        bool completed,
        bytes32 stepsHash,
        uint256 improvementBps,
        uint256 completionTime
    ) {
        OptimizationJob memory job = jobs[jobId];
        return (
            job.auction,
            job.creator,
            job.createdTime,
            job.completed,
            job.stepsHash,
            job.improvementBps,
            job.completionTime
        );
    }
}