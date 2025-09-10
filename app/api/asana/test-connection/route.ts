/**
 * API route for testing Asana API connection
 */

import { NextResponse } from 'next/server';
import { AsanaApiClient } from '../../../../src/lib/asanaApi';

export async function GET() {
  try {
    // Create API client instance (server-side)
    const apiClient = new AsanaApiClient();
    
    // Test the connection
    const isConnected = await apiClient.testConnection();
    
    return NextResponse.json({
      success: true,
      connected: isConnected
    });
    
  } catch (error) {
    console.error('Error testing Asana connection:', error);
    
    return NextResponse.json(
      {
        success: false,
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}