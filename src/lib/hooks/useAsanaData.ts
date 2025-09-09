/**
 * Custom hook for managing Asana data fetching and caching
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AsanaReport, Assignee } from '../../models/asanaReport';
import { AssigneeStats, processAssigneeStats, calculateTeamAverages } from '../dataProcessor';
import { 
  saveReport, 
  loadReport, 
  clearCache,
  saveUserPreferences,
  loadUserPreferences
} from '../supabaseStorage';
import { useAsanaApi, LoadingProgress, getAsanaApiClient } from '../asanaApi';

export interface UseAsanaDataReturn {
  // Data
  report: AsanaReport | null;
  assignees: Assignee[];
  selectedAssignee: Assignee | null;
  assigneeStats: AssigneeStats | null;
  teamAverages: ReturnType<typeof calculateTeamAverages> | null;
  
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
  const [report, setReport] = useState<AsanaReport | null>(null);
  const [selectedAssigneeGid, setSelectedAssigneeGid] = useState<string | null>(initialAssigneeGid || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null);
  
  // Progress callback for API calls
  const handleProgress = useCallback((progress: LoadingProgress) => {
    setLoadingProgress(progress);
  }, []);
  
  const api = useAsanaApi();
  
  // Set progress callback when component mounts (only once)
  useEffect(() => {
    const client = getAsanaApiClient();
    client.setProgressCallback(handleProgress);
  }, [handleProgress]); // Include handleProgress as dependency since it's stable

  // Derived data
  const assignees = useMemo(() => report?.getAllAssignees() || [], [report]);
  const selectedAssignee = useMemo(() => 
    selectedAssigneeGid ? assignees.find(a => a.gid === selectedAssigneeGid) || null : null,
    [selectedAssigneeGid, assignees]
  );
  
  const assigneeStats = report && selectedAssigneeGid ? 
    processAssigneeStats(report, selectedAssigneeGid) : null;
  
  const teamAverages = report ? calculateTeamAverages(report) : null;

  const fetchFromApi = useCallback(async () => {
    try {
      console.log('Fetching fresh data from Asana API...');
      setLoadingProgress({ current: 0, total: 100, percentage: 0, status: 'Starting...' });
      
      const freshReport = await api.fetchCompleteReport();
      
      // Save to Supabase
      await saveReport(freshReport);
      setReport(freshReport);
      
      // Clear progress when done
      setLoadingProgress(null);
      
      console.log('Data fetched and cached successfully');
    } catch (err) {
      console.error('Error fetching from API:', err);
      setLoadingProgress(null);
      throw err;
    }
  }, [api]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);
      setLoadingProgress(null);

      // Try to load from Supabase cache first
      const cachedReport = await loadReport();
      if (cachedReport) {
        setReport(cachedReport);
        setIsLoading(false);
        return;
      }

      // If no cache, fetch from API
      await fetchFromApi();
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
      setLoadingProgress(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchFromApi]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load user preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const preferences = await loadUserPreferences();
        if (preferences.selectedAssignee && !selectedAssigneeGid) {
          setSelectedAssigneeGid(preferences.selectedAssignee);
        }
      } catch (error) {
        console.error('Error loading user preferences:', error);
      }
    };

    loadPreferences();
  }, [selectedAssigneeGid]);

  // Auto-select first assignee if none selected
  useEffect(() => {
    if (!selectedAssigneeGid && assignees.length > 0) {
      setSelectedAssigneeGid(assignees[0].gid);
    }
  }, [assignees, selectedAssigneeGid]);

  const refreshData = useCallback(async () => {
    try {
      setError(null);
      setIsRefreshing(true);
      setLoadingProgress(null);
      
      // Clear cache and fetch fresh data
      await clearCache();
      await fetchFromApi();
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
      setLoadingProgress(null);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchFromApi]);

  const selectAssignee = useCallback(async (assigneeGid: string) => {
    setSelectedAssigneeGid(assigneeGid);
    
    // Save preference to Supabase (non-blocking)
    try {
      await saveUserPreferences({ selectedAssignee: assigneeGid });
    } catch (error) {
      console.error('Error saving user preference:', {
        error,
        message: error instanceof Error ? error.message : 'Unknown error',
        assigneeGid
      });
      // Note: We don't show an error to the user as this is non-critical functionality
      // The selection still works, just the preference won't be persisted
    }
  }, []);

  const fetchData = useCallback(async () => {
    return loadData();
  }, [loadData]);

  return {
    // Data
    report,
    assignees,
    selectedAssignee,
    assigneeStats,
    teamAverages,
    
    // States
    isLoading,
    isRefreshing,
    error,
    loadingProgress,
    
    // Actions
    fetchData,
    selectAssignee,
    refreshData,
  };
}

/**
 * Hook for testing API connection
 */
export function useApiTest() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);
  const api = useAsanaApi();

  const testConnection = useCallback(async () => {
    setIsTestLoading(true);
    try {
      const result = await api.testConnection();
      setIsConnected(result);
      return result;
    } catch (error) {
      console.error('API test failed:', error);
      setIsConnected(false);
      return false;
    } finally {
      setIsTestLoading(false);
    }
  }, [api]);

  return {
    isConnected,
    isTestLoading,
    testConnection
  };
}