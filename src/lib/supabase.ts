/**
 * Supabase client configuration
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only create client if we have the required environment variables
export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
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