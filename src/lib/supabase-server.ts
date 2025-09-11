/**
 * Server-side Supabase client configuration for API routes
 */

import { createServerClient } from '@supabase/ssr';
import { NextRequest } from 'next/server';

/**
 * Create a Supabase client for server-side use in API routes
 * This client properly handles cookies for authentication
 */
export function createServerSideClient(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

  // Use request cookies for API routes
  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Note: We can't set cookies in API routes easily, 
        // but this is mainly for reading existing sessions
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
      },
    },
  });
}