/**
 * API route for fetching Asana team users
 */

import { NextResponse } from 'next/server';
import { AsanaApiClient } from '../../../../src/lib/asanaApi';

export async function GET() {
  try {
    // Create API client instance (server-side)
    const apiClient = new AsanaApiClient();
    
    // Fetch team users
    const teamUsers = await apiClient.fetchTeamUsers();
    
    return NextResponse.json({
      success: true,
      data: teamUsers
    });
    
  } catch (error) {
    console.error('Error fetching team users:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}