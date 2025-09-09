/**
 * Custom hook for managing Asana data fetching and caching
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AsanaReport, Assignee } from '../../models/asanaReport';
import { AssigneeStats, processAssigneeStats, calculateTeamAverages } from '../dataProcessor';
import { useReportCache } from '../storage';
import { useAsanaApi } from '../asanaApi';

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

  const cache = useReportCache();
  const api = useAsanaApi();

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
      const freshReport = await api.fetchCompleteReport();
      
      // Save to cache
      cache.save(freshReport);
      setReport(freshReport);
      
      console.log('Data fetched and cached successfully');
    } catch (err) {
      console.error('Error fetching from API:', err);
      throw err;
    }
  }, [api, cache]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      setIsLoading(true);

      // Try to load from cache first
      const cachedReport = cache.load();
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
    } finally {
      setIsLoading(false);
    }
  }, [cache, fetchFromApi]);

  // Load data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

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
      
      // Clear cache and fetch fresh data
      cache.clear();
      await fetchFromApi();
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  }, [cache, fetchFromApi]);

  const selectAssignee = useCallback((assigneeGid: string) => {
    setSelectedAssigneeGid(assigneeGid);
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