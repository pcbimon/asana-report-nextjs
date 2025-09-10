/**
 * API route for fetching complete Asana report
 * This handles server-side Asana API integration
 */

import { NextRequest, NextResponse } from 'next/server';
import { AsanaApiClient } from '../../../../src/lib/asanaApi';

export async function GET(request: NextRequest) {
  try {
    // Create API client instance (server-side)
    const apiClient = new AsanaApiClient();
    
    // Set up progress tracking if needed
    const searchParams = request.nextUrl.searchParams;
    const includeProgress = searchParams.get('progress') === 'true';
    
    if (includeProgress) {
      // For now, we'll handle progress differently since SSE might be complex
      // This is a simple implementation
      apiClient.setProgressCallback((progress) => {
        console.log(`Progress: ${progress.percentage}% - ${progress.status}`);
      });
    }
    
    // Fetch the complete report
    const report = await apiClient.fetchCompleteReport();
    
    return NextResponse.json({
      success: true,
      data: report
    });
    
  } catch (error) {
    console.error('Error fetching Asana report:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}