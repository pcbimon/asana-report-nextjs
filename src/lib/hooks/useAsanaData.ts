/**
 * DEPRECATED: Use useAsanaDataApi instead
 * This hook is kept for backward compatibility but should not be used in new code
 */

'use client';

// This file is deprecated and should not be used
// Use useAsanaDataApi from ./useAsanaDataApi instead

export interface LoadingProgress {
  current: number;
  total: number;
  percentage: number;
  status: string;
}

export interface UseAsanaDataReturn {
  // Data
  report: any;
  assignees: any[];
  selectedAssignee: any;
  assigneeStats: any;
  teamAverages: any;
  
  // States
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  loadingProgress: LoadingProgress | null;
  
  // Actions
  fetchData: () => Promise<void>;
  selectAssignee: (assigneeGid: string) => void;
  refreshData: () => Promise<void>;
}

export function useAsanaData(initialAssigneeGid?: string): UseAsanaDataReturn {
  throw new Error('useAsanaData is deprecated. Use useAsanaData from useAsanaDataApi instead.');
}

export function useApiTest() {
  throw new Error('useApiTest is deprecated. Use useApiTest from useAsanaDataApi instead.');
}