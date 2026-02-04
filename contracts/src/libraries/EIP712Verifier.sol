//contracts/src/libraries/EIP712Verifier.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

library EIP712Verifier {
    bytes32 private constant _X402_TICKET_TYPEHASH = keccak256(
        "X402Ticket(address user,uint256 auctionId,uint256 maxBidAmount,uint256 expiry,uint256 paymentAmount,address paymentToken,uint256 nonce)"
    );
    
    function verifyTicket(
        address user,
        uint256 auctionId,
        uint256 maxBidAmount,
        uint256 expiry,
        uint256 paymentAmount,
        address paymentToken,
        uint256 nonce,
        bytes memory signature,
        address signer,
        bytes32 domainSeparator
    ) internal pure returns (bool) {
        bytes32 structHash = keccak256(
            abi.encode(
                _X402_TICKET_TYPEHASH,
                user,
                auctionId,
                maxBidAmount,
                expiry,
                paymentAmount,
                paymentToken,
                nonce
            )
        );
        
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", domainSeparator, structHash)
        );
        
        return recoverSigner(digest, signature) == signer;
    }
    
    function recoverSigner(bytes32 digest, bytes memory signature) 
        internal 
        pure 
        returns (address) 
    {
        require(signature.length == 65, "Invalid signature length");
        
        bytes32 r;
        bytes32 s;
        uint8 v;
        
        assembly {
            r := mload(add(signature, 32))
            s := mload(add(signature, 64))
            v := byte(0, mload(add(signature, 96)))
        }
        
        if (v < 27) {
            v += 27;
        }
        
        require(v == 27 || v == 28, "Invalid signature version");
        
        return ecrecover(digest, v, r, s);
    }
    
    function generateDomainSeparator(
        string memory name,
        string memory version,
        uint256 chainId,
        address verifyingContract
    ) internal pure returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes(name)),
                keccak256(bytes(version)),
                chainId,
                verifyingContract
            )
        );
    }
}