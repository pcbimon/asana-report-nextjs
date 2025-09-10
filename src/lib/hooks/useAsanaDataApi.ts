/**
 * Custom hook for managing Asana data fetching via API routes with role-based access
 * This replaces direct AsanaApiClient usage with server-side API calls
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { AsanaReport, Assignee } from '../../models/asanaReport';
import { AssigneeStats, processAssigneeStats, calculateTeamAverages } from '../dataProcessor';
import { 
  saveReport, 
  loadReport, 
  clearCache,
  loadUserPreferences
} from '../supabaseStorage';
import { useAuth } from '../../contexts/AuthContext';
import { userRoleService } from '../userRoleService';
import { UserRoleLevel } from '../../types/userRoles';

export interface LoadingProgress {
  current: number;
  total: number;
  percentage: number;
  status: string;
}

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

/**
 * Fetch complete report from API route
 */
async function fetchReportFromApi(): Promise<AsanaReport> {
  const response = await fetch('/api/asana/report');
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch report');
  }
  
  // Convert the plain object back to AsanaReport instance
  return AsanaReport.fromJSON(result.data);
}

/**
 * Test API connection via API route
 */
async function testApiConnection(): Promise<boolean> {
  const response = await fetch('/api/asana/test-connection');
  
  if (!response.ok) {
    return false;
  }
  
  const result = await response.json();
  return result.success && result.connected;
}

/**
 * Fetch team users via API route
 */
async function fetchTeamUsersFromApi(): Promise<Assignee[]> {
  const response = await fetch('/api/asana/team-users');
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
  }
  
  const result = await response.json();
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch team users');
  }
  
  // Convert plain objects back to Assignee instances
  return result.data.map((user: any) => new Assignee(user.gid, user.name, user.email));
}

export function useAsanaData(initialAssigneeGid?: string): UseAsanaDataReturn {
  const [report, setReport] = useState<AsanaReport | null>(null);
  const [selectedAssigneeGid, setSelectedAssigneeGid] = useState<string | null>(initialAssigneeGid || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<LoadingProgress | null>(null);
  
  // Get auth context for role-based filtering
  const { user, userRole, permissions } = useAuth();

  // Role-filtered assignees based on user permissions
  const assignees = useMemo(() => {
    const allAssignees = report?.getAllAssignees() || [];
    
    if (!user?.email || !permissions) {
      return [];
    }

    // If user can view all data (Director/Admin), return all assignees
    if (permissions.canViewAllData) {
      return allAssignees;
    }

    // Filter assignees based on viewable emails
    return userRoleService.filterAssigneesByRole(allAssignees, permissions.viewableEmails);
  }, [report, user, permissions]);

  // Auto-select current user's data for operational level users
  const selectedAssignee = useMemo(() => {
    if (!selectedAssigneeGid && userRole?.role_level === UserRoleLevel.OPERATIONAL && user?.email) {
      // For operational users, auto-select their own data
      const userAssignee = assignees.find(a => a.email === user.email);
      if (userAssignee) {
        setSelectedAssigneeGid(userAssignee.gid);
        return userAssignee;
      }
    }
    
    return selectedAssigneeGid ? assignees.find(a => a.gid === selectedAssigneeGid) || null : null;
  }, [selectedAssigneeGid, assignees, userRole, user]);
  
  const assigneeStats = report && selectedAssigneeGid ? 
    processAssigneeStats(report, selectedAssigneeGid) : null;
  
  const teamAverages = report ? calculateTeamAverages(report) : null;

  const fetchFromApi = useCallback(async () => {
    try {
      console.log('Fetching fresh data from Asana API via server...');
      setLoadingProgress({ current: 0, total: 100, percentage: 0, status: 'Starting...' });
      
      // Update progress periodically (since we can't get real-time progress from API route yet)
      const progressInterval = setInterval(() => {
        setLoadingProgress(prev => {
          if (!prev) return { current: 10, total: 100, percentage: 10, status: 'Loading...' };
          const newCurrent = Math.min(prev.current + 10, 90);
          return {
            current: newCurrent,
            total: 100,
            percentage: newCurrent,
            status: 'Fetching data from server...'
          };
        });
      }, 2000);
      
      const freshReport = await fetchReportFromApi();
      
      clearInterval(progressInterval);
      setLoadingProgress({ current: 95, total: 100, percentage: 95, status: 'Saving to cache...' });
      
      // Save to Supabase
      await saveReport(freshReport);
      setReport(freshReport);
      
      // Clear progress when done
      setLoadingProgress({ current: 100, total: 100, percentage: 100, status: 'Complete!' });
      setTimeout(() => setLoadingProgress(null), 1000);
      
      console.log('Data fetched and cached successfully');
    } catch (err) {
      console.error('Error fetching from API:', err);
      setLoadingProgress(null);
      throw err;
    }
  }, []);

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
    // Check if user has permission to select this assignee
    if (!permissions?.canSelectUsers && userRole?.role_level === UserRoleLevel.OPERATIONAL) {
      // Operational users can only view their own data
      const userAssignee = assignees.find(a => a.email === user?.email);
      if (userAssignee && assigneeGid !== userAssignee.gid) {
        console.warn('Operational users can only view their own data');
        return;
      }
    }
    
    setSelectedAssigneeGid(assigneeGid);
  }, [permissions, userRole, assignees, user]);

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
 * Hook for testing API connection via API route
 */
export function useApiTest() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isTestLoading, setIsTestLoading] = useState(false);

  const testConnection = useCallback(async () => {
    setIsTestLoading(true);
    try {
      const result = await testApiConnection();
      setIsConnected(result);
      return result;
    } catch (error) {
      console.error('API test failed:', error);
      setIsConnected(false);
      return false;
    } finally {
      setIsTestLoading(false);
    }
  }, []);

  return {
    isConnected,
    isTestLoading,
    testConnection
  };
}