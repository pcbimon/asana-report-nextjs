/**
 * SSE endpoint for streaming real-time progress during Asana report fetching
 * This provides live progress updates to avoid the user seeing stuck loading at 95%
 */

import { NextRequest } from 'next/server';
import { AsanaApiClient } from '../../../../src/lib/asanaApi';

export async function GET(request: NextRequest) {
  // Create a ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      
      // Helper function to send SSE data
      const sendProgress = (progress: any) => {
        const data = `data: ${JSON.stringify(progress)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      // Start the async data fetching process
      const fetchData = async () => {
        try {
          // Create API client instance with progress callback
          const apiClient = new AsanaApiClient();
          
          // Set up progress callback to stream to client
          apiClient.setProgressCallback((progress) => {
            sendProgress({
              type: 'progress',
              ...progress
            });
          });
          
          // Fetch the complete report with streaming progress
          const report = await apiClient.fetchCompleteReport();
          
          // Send success message with the data
          sendProgress({
            type: 'complete',
            success: true,
            data: report
          });
          
          // Close the stream
          controller.close();
          
        } catch (error) {
          console.error('Error in report stream:', error);
          
          // Send error message
          sendProgress({
            type: 'error',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error occurred'
          });
          
          // Close the stream
          controller.close();
        }
      };

      // Start fetching data immediately
      fetchData();
    },
    
    cancel() {
      // Handle client disconnect
      console.log('SSE stream cancelled by client');
    }
  });

  // Return SSE response
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}