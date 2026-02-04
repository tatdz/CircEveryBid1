// src/interfaces/IPoseidon.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IPoseidon {
    function hash(uint256[] calldata inputs) external pure returns (uint256);
}