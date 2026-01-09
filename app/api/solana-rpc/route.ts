import { NextRequest, NextResponse } from 'next/server';

/**
 * Solana RPC Proxy API Route
 *
 * This API route proxies Solana RPC requests to avoid CORS issues
 * and keeps your dedicated RPC URL secure on the server side.
 */

// Store your dedicated RPC URLs here (server-side only)
const SOLANA_RPC_URLS = {
  mainnet: process.env.SOLANA_MAINNET_RPC_URL || 'https://api.mainnet-beta.solana.com',
  devnet: process.env.SOLANA_DEVNET_RPC_URL || 'https://api.devnet.solana.com',
};

export async function POST(request: NextRequest) {
  try {
    // Get the network from query params
    const searchParams = request.nextUrl.searchParams;
    const network = searchParams.get('network') || 'devnet';

    // Validate network
    if (network !== 'mainnet' && network !== 'devnet') {
      return NextResponse.json(
        { error: 'Invalid network. Must be mainnet or devnet' },
        { status: 400 }
      );
    }

    // Get the RPC URL for the specified network
    const rpcUrl = SOLANA_RPC_URLS[network as keyof typeof SOLANA_RPC_URLS];

    // Get the request body (the JSON-RPC request)
    const body = await request.json();

    // Forward the request to the Solana RPC endpoint
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    // Return the response from the Solana RPC
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
  } catch (error) {
    console.error('Solana RPC proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to proxy Solana RPC request' },
      { status: 500 }
    );
  }
}
