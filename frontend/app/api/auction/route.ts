// app/api/auction/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, parseUnits, formatUnits, decodeEventLog } from 'viem';
import { baseSepolia } from 'viem/chains';

// Environment variables
const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as `0x${string}`;
const SELLER_ADDRESS = process.env.NEXT_PUBLIC_X402_SELLER_ADDRESS as `0x${string}`;
const ACCESS_FEE_USDC = process.env.NEXT_PUBLIC_ACCESS_FEE_USDC || '1';
const ALCHEMY_BASE_SEPOLIA_URL = process.env.ALCHEMY_BASE_SEPOLIA_URL;

// USDC ABI for transfer events
const USDC_ABI = [
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "name": "from", "type": "address" },
      { "indexed": true, "name": "to", "type": "address" },
      { "indexed": false, "name": "value", "type": "uint256" }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "constant": true,
    "inputs": [],
    "name": "decimals",
    "outputs": [{ "name": "", "type": "uint8" }],
    "type": "function"
  }
] as const;

export async function POST(request: NextRequest) {
  const requestId = Math.random().toString(36).substring(7);
  const startTime = Date.now();
  
  console.log(`🚀 [${requestId}] /api/auction called`);

  try {
    const body = await request.json();
    const { userAddress, auctionId, paymentProof } = body;

    if (!userAddress) {
      console.log(`❌ [${requestId}] No user address provided`);
      return NextResponse.json(
        { success: false, error: 'User address is required' },
        { status: 400 }
      );
    }

    if (!auctionId) {
      console.log(`❌ [${requestId}] No auction ID provided`);
      return NextResponse.json(
        { success: false, error: 'Auction ID is required' },
        { status: 400 }
      );
    }

    // Check for payment proof header
    const paymentProofHeader = request.headers.get('X-Payment-Proof');
    
    if (!paymentProofHeader && !paymentProof) {
      console.log(`💰 [${requestId}] Payment required - no proof provided for auction ${auctionId}`);
      
      return NextResponse.json(
        {
          success: false,
          accessGranted: false,
          paymentRequired: true,
          message: 'Payment required for auction access',
          paymentDetails: {
            amount: ACCESS_FEE_USDC,
            currency: 'USDC',
            network: 'base-sepolia',
            to: SELLER_ADDRESS,
            token: USDC_ADDRESS,
            decimals: 6, // USDC has 6 decimals
            requiredAmount: parseUnits(ACCESS_FEE_USDC, 6).toString()
          }
        },
        { status: 402 }
      );
    }

    // Verify payment proof
    const proof = paymentProof || JSON.parse(paymentProofHeader || '{}');
    
    console.log(`🔍 [${requestId}] Verifying payment proof for auction ${auctionId}:`, {
      userAddress,
      hasTransactionHash: !!proof.transactionHash,
      transactionHash: proof.transactionHash,
      hasIntentId: !!proof.intentId,
      amount: proof.amount,
      currency: proof.currency
    });

    // Validate proof structure
    if (!proof.transactionHash) {
      console.log(`❌ [${requestId}] Missing transaction hash in payment proof`);
      return NextResponse.json(
        { success: false, error: 'Invalid payment proof: missing transaction hash' },
        { status: 400 }
      );
    }

    // Create Viem client for Base Sepolia
    const publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(ALCHEMY_BASE_SEPOLIA_URL)
    });

    console.log(`🔗 [${requestId}] Verifying transaction on-chain: ${proof.transactionHash}`);

    // Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({
      hash: proof.transactionHash as `0x${string}`
    }).catch(error => {
      console.error(`❌ [${requestId}] Failed to get transaction receipt:`, error);
      return null;
    });

    if (!receipt) {
      console.log(`❌ [${requestId}] Transaction not found or not confirmed`);
      return NextResponse.json(
        { success: false, error: 'Transaction not found or not confirmed on-chain' },
        { status: 400 }
      );
    }

    console.log(`✅ [${requestId}] Transaction found:`, {
      status: receipt.status,
      blockNumber: receipt.blockNumber,
      from: receipt.from,
      to: receipt.to,
      logsCount: receipt.logs.length
    });

    // Verify transaction was successful
    if (receipt.status !== 'success') {
      console.log(`❌ [${requestId}] Transaction failed`);
      return NextResponse.json(
        { success: false, error: 'Payment transaction failed on-chain' },
        { status: 400 }
      );
    }

    // Check if this is a USDC transfer to our seller address
    const requiredAmount = parseUnits(ACCESS_FEE_USDC, 6); // USDC has 6 decimals
    
    // Look for Transfer events
    let paymentVerified = false;
    let transferAmount = BigInt(0);
    
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === USDC_ADDRESS.toLowerCase()) {
        try {
          // Try to decode as Transfer event
          const decodedLog = decodeEventLog({
            abi: USDC_ABI,
            data: log.data,
            topics: log.topics as [`0x${string}`, `0x${string}`, `0x${string}`]
          });
          
          if (decodedLog.eventName === 'Transfer') {
            const args = decodedLog.args as unknown;
            const { from, to, value } = args as { from: string; to: string; value: bigint };
            
            console.log(`📊 [${requestId}] Found USDC Transfer event:`, {
              from,
              to,
              value: value.toString(),
              formatted: formatUnits(value, 6)
            });
            
            // Check if this is the correct payment
            if (to.toLowerCase() === SELLER_ADDRESS.toLowerCase() && 
                from.toLowerCase() === userAddress.toLowerCase()) {
              
              transferAmount = value;
              
              if (value >= requiredAmount) {
                paymentVerified = true;
                console.log(`✅ [${requestId}] Payment verified! Amount: ${formatUnits(value, 6)} USDC`);
                break;
              } else {
                console.log(`❌ [${requestId}] Insufficient payment: ${formatUnits(value, 6)} USDC, required: ${ACCESS_FEE_USDC} USDC`);
              }
            }
          }
        } catch (error) {
          // Not a Transfer event, continue
          continue;
        }
      }
    }

    if (!paymentVerified) {
      console.log(`❌ [${requestId}] Payment verification failed`);
      
      // Provide detailed error
      if (transferAmount > 0n) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Insufficient payment: ${formatUnits(transferAmount, 6)} USDC received, ${ACCESS_FEE_USDC} USDC required` 
          },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          error: 'No valid USDC payment found to the specified seller address' 
        },
        { status: 400 }
      );
    }

    // Additional verification: Check transaction sender matches user address
    if (receipt.from.toLowerCase() !== userAddress.toLowerCase()) {
      console.log(`❌ [${requestId}] Transaction sender mismatch:`, {
        expected: userAddress,
        actual: receipt.from
      });
      
      return NextResponse.json(
        { success: false, error: 'Transaction sender does not match user address' },
        { status: 400 }
      );
    }

    // Payment verified successfully
    const accessGrantedAt = new Date().toISOString();
    const processingTime = Date.now() - startTime;
    
    console.log(`🎉 [${requestId}] Access granted to ${userAddress} for auction ${auctionId}`);
    console.log(`📈 [${requestId}] Transaction details:`, {
      blockNumber: receipt.blockNumber,
      transactionHash: proof.transactionHash,
      amount: formatUnits(transferAmount, 6) + ' USDC',
      verifiedAt: accessGrantedAt
    });
    console.log(`⏱️ [${requestId}] Processed in ${processingTime}ms`);

    // Generate a unique access token for this session
    const encoder = new TextEncoder();
    const data = encoder.encode(`${userAddress}:${auctionId}:${receipt.blockNumber}:${Date.now()}`);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const accessToken = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 40);

    return NextResponse.json({
      success: true,
      accessGranted: true,
      message: `Access granted to auction ${auctionId}`,
      userData: {
        address: userAddress,
        auctionId,
        accessGrantedAt,
        paymentVerified: true,
        transactionHash: proof.transactionHash,
        amountPaid: formatUnits(transferAmount, 6),
        currency: 'USDC',
        accessToken
      },
      verificationDetails: {
        blockNumber: Number(receipt.blockNumber),
        transactionIndex: receipt.transactionIndex,
        timestamp: Date.now(),
        onChainVerified: true
      }
    });

  } catch (error: any) {
    console.error(`💥 [${requestId}] API error:`, error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check auction status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const auctionId = searchParams.get('id');
    
    if (!auctionId) {
      return NextResponse.json(
        { success: false, error: 'Auction ID is required' },
        { status: 400 }
      );
    }

    // In a real implementation, you would fetch auction data from a database
    // For now, return basic auction info
    
    return NextResponse.json({
      success: true,
      auction: {
        id: auctionId,
        status: 'active',
        paymentRequired: true,
        paymentDetails: {
          amount: ACCESS_FEE_USDC,
          currency: 'USDC',
          network: 'base-sepolia'
        }
      }
    });

  } catch (error: any) {
    console.error('GET /api/auction error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    );
  }
}