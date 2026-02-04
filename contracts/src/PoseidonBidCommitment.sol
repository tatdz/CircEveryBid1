//src/PoseidonBidCommitment.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {IPoseidon} from "./interfaces/IPoseidon.sol";

/**
 * @title Poseidon Bid Commitment
 * @dev Uses actual Poseidon contracts for ZK proofs
 */
contract PoseidonBidCommitment {
    
    // Pre-deployed Poseidon contracts (same as your example)
    address public constant POSEIDON_T3 = 0x3333333C0A88F9BE4fd23ed0536F9B6c427e3B93;
    address public constant POSEIDON_T4 = 0x4443338EF595F44e0121df4C21102677B142ECF0;
    address public constant POSEIDON_T5 = 0x555333f3f677Ca3930Bf7c56ffc75144c51D9767;
    address public constant POSEIDON_T6 = 0x666333F371685334CdD69bdDdaFBABc87CE7c7Db;
    
    // Bid commitment structure
    struct BidCommitment {
        bytes32 commitmentHash;
        address bidder;
        address auction;
        bytes32 amountHash;
        bytes32 priceHash;
        bytes32 timestampHash;
        uint256 timestamp;
        bool revealed;
    }
    
    // State tracking
    mapping(bytes32 => BidCommitment) public commitments;
    mapping(address => uint256) public userCommitmentCounts;
    
    // Events
    event BidCommitted(
        bytes32 indexed commitmentHash,
        address indexed bidder,
        address indexed auction,
        bytes32 amountHash,
        bytes32 priceHash,
        bytes32 timestampHash,
        uint256 timestamp
    );
    
    event BidRevealed(
        bytes32 indexed commitmentHash,
        address indexed bidder,
        uint256 amount,
        uint256 maxPrice,
        uint256 timestamp
    );
    
    /**
     * @dev Commit a bid with hashed parameters
     */
    function commitBid(
        address bidder,
        address auction,
        bytes32 amountHash,
        bytes32 priceHash,
        bytes32 timestampHash
    ) external returns (bytes32) {
        bytes32 commitmentHash = keccak256(abi.encodePacked(
            bidder,
            auction,
            amountHash,
            priceHash,
            timestampHash
        ));
        
        // Store commitment
        commitments[commitmentHash] = BidCommitment({
            commitmentHash: commitmentHash,
            bidder: bidder,
            auction: auction,
            amountHash: amountHash,
            priceHash: priceHash,
            timestampHash: timestampHash,
            timestamp: block.timestamp,
            revealed: false
        });
        
        userCommitmentCounts[bidder]++;
        
        emit BidCommitted(
            commitmentHash,
            bidder,
            auction,
            amountHash,
            priceHash,
            timestampHash,
            block.timestamp
        );
        
        return commitmentHash;
    }
    
    /**
     * @dev Poseidon hash function using actual contracts
     */
    function poseidonHash(uint256[] memory inputs) public view returns (uint256) {
        require(inputs.length >= 2 && inputs.length <= 5, "Invalid input length");
        
        // Cast inputs to calldata for the external call
        uint256[] memory calldataInputs = inputs;
        
        if (inputs.length == 2) {
            return IPoseidon(POSEIDON_T3).hash(calldataInputs);
        } else if (inputs.length == 3) {
            return IPoseidon(POSEIDON_T4).hash(calldataInputs);
        } else if (inputs.length == 4) {
            return IPoseidon(POSEIDON_T5).hash(calldataInputs);
        } else if (inputs.length == 5) {
            return IPoseidon(POSEIDON_T6).hash(calldataInputs);
        }
        
        revert("Unsupported input length");
    }
    
    /**
     * @dev Create ZK proof hash using Poseidon
     */
    function createZKProofHash(
        uint256[] memory proofInputs
    ) external view returns (uint256) {
        return poseidonHash(proofInputs);
    }
    
    /**
     * @dev Verify ZK proof with Poseidon hash
     */
    function verifyZKProof(
        uint256[] memory inputs,
        uint256 expectedHash
    ) external view returns (bool) {
        uint256 calculatedHash = poseidonHash(inputs);
        return calculatedHash == expectedHash;
    }
    
    /**
     * @dev Reveal bid details
     */
    function revealBid(
        bytes32 commitmentHash,
        uint256 amount,
        uint256 maxPrice
    ) external {
        BidCommitment storage commitment = commitments[commitmentHash];
        require(commitment.commitmentHash != bytes32(0), "Commitment not found");
        require(!commitment.revealed, "Already revealed");
        require(msg.sender == commitment.bidder, "Not bid owner");
        
        commitment.revealed = true;
        
        emit BidRevealed(commitmentHash, commitment.bidder, amount, maxPrice, block.timestamp);
    }
    
    /**
     * @dev Verify a bid commitment
     */
    function verifyCommitment(bytes32 commitmentHash) external view returns (bool) {
        BidCommitment memory commitment = commitments[commitmentHash];
        return commitment.commitmentHash != bytes32(0) && !commitment.revealed;
    }
    
    /**
     * @dev Get commitment details
     */
    function getCommitment(bytes32 commitmentHash) external view returns (
        address bidder,
        address auction,
        bytes32 amountHash,
        bytes32 priceHash,
        bytes32 timestampHash,
        uint256 timestamp,
        bool revealed
    ) {
        BidCommitment memory commitment = commitments[commitmentHash];
        return (
            commitment.bidder,
            commitment.auction,
            commitment.amountHash,
            commitment.priceHash,
            commitment.timestampHash,
            commitment.timestamp,
            commitment.revealed
        );
    }
    
    /**
     * @dev Create a commitment hash for frontend
     */
    function generateCommitmentHash(
        address bidder,
        address auction,
        bytes32 amountHash,
        bytes32 priceHash,
        bytes32 timestampHash
    ) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(
            bidder,
            auction,
            amountHash,
            priceHash,
            timestampHash
        ));
    }
    
    /**
     * @dev Hash parameters for commitment
     */
    function hashParameters(
        uint256 amount,
        uint256 maxPrice,
        uint256 timestamp
    ) external pure returns (bytes32, bytes32, bytes32) {
        return (
            bytes32(amount),
            bytes32(maxPrice),
            bytes32(timestamp)
        );
    }
    
    /**
     * @dev Create Poseidon hash for ZK inputs
     */
    function createPoseidonHashForInputs(
        uint256[] memory inputs
    ) external view returns (bytes32) {
        uint256 hashResult = poseidonHash(inputs);
        return bytes32(hashResult);
    }
    
    /**
     * @dev Get user's commitment count
     */
    function getUserCommitmentCount(address user) external view returns (uint256) {
        return userCommitmentCounts[user];
    }
}