//src/interfaces/IMessageTransmitter.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IMessageTransmitter {
    function receiveMessage(
        bytes memory message,
        bytes calldata attestation
    ) external returns (bool);
    
    function replaceMessage(
        bytes memory originalMessage,
        bytes calldata originalAttestation,
        bytes memory newMessageBody,
        bytes32 newDestinationCaller
    ) external;
    
    function sendMessage(
        uint32 destinationDomain,
        bytes32 recipient,
        bytes memory messageBody
    ) external returns (uint64);
    
    function sendMessageWithCaller(
        uint32 destinationDomain,
        bytes32 recipient,
        bytes32 destinationCaller,
        bytes memory messageBody
    ) external returns (uint64);
    
    function maxMessageBodySize() external view returns (uint256);
    function nextAvailableNonce() external view returns (uint64);
    function usedNonces(uint32 sourceDomain, uint64 nonce) external view returns (bool);
    
    event MessageSent(bytes message);
    event MessageReceived(
        address indexed caller,
        uint32 sourceDomain,
        uint64 indexed nonce,
        bytes32 sender,
        bytes messageBody
    );
}