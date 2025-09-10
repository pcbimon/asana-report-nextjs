/**
 * Supabase client configuration
 */

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

// Create browser client for client-side operations
export function createClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}

// Legacy export for backward compatibility
export const supabase = supabaseUrl && supabasePublishableKey 
  ? createClient()
  : null;

/**
 * Database schema types
 */
export interface AsanaReportRecord {
  id: number;
  data: any;
  timestamp: string;
  version: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferences {
  id: number;
  user_id: string;
  selected_assignee?: string;
  time_range?: string;
  project_filter?: string;
  status_filter?: string;
  created_at: string;
  updated_at: string;
}