/**
 * Local Storage utilities for caching Asana report data
 * Handles saving, loading, and managing cached data with TTL
 */

import { AsanaReport, Section, Task, Subtask, Assignee } from '../models/asanaReport';

const STORAGE_KEY = 'asana_report_data';
const DEFAULT_TTL_HOURS = 12; // Default cache TTL: 12 hours

interface StoredReport {
  data: any;
  timestamp: number;
  version: string;
}

/**
 * Save AsanaReport to Local Storage
 */
export function saveReport(report: AsanaReport): void {
  try {
    const storedReport: StoredReport = {
      data: reportToJSON(report),
      timestamp: Date.now(),
      version: '1.0.0'
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedReport));
    console.log('Report saved to Local Storage successfully');
  } catch (error) {
    console.error('Error saving report to Local Storage:', error);
    // If storage is full, try to clear old data
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        data: reportToJSON(report),
        timestamp: Date.now(),
        version: '1.0.0'
      }));
      console.log('Report saved to Local Storage after clearing old data');
    } catch (retryError) {
      console.error('Failed to save report even after clearing storage:', retryError);
      throw new Error('Unable to save report to Local Storage');
    }
  }
}

/**
 * Load AsanaReport from Local Storage
 * Returns null if cache is expired or doesn't exist
 */
export function loadReport(ttlHours: number = DEFAULT_TTL_HOURS): AsanaReport | null {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) {
      console.log('No cached report found');
      return null;
    }

    const storedReport: StoredReport = JSON.parse(storedData);
    
    // Check if cache is expired
    const now = Date.now();
    const cacheAge = now - storedReport.timestamp;
    const ttlMs = ttlHours * 60 * 60 * 1000;
    
    if (cacheAge > ttlMs) {
      console.log(`Cache expired (${Math.round(cacheAge / 1000 / 60)} minutes old, TTL: ${ttlHours} hours)`);
      return null;
    }

    // Convert JSON back to AsanaReport instance
    const report = reportFromJSON(storedReport.data);
    console.log(`Loaded cached report (${Math.round(cacheAge / 1000 / 60)} minutes old)`);
    return report;
  } catch (error) {
    console.error('Error loading report from Local Storage:', error);
    // Clear corrupted data
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * Check if cached report exists and is fresh
 */
export function isCacheFresh(ttlHours: number = DEFAULT_TTL_HOURS): boolean {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) return false;

    const storedReport: StoredReport = JSON.parse(storedData);
    const now = Date.now();
    const cacheAge = now - storedReport.timestamp;
    const ttlMs = ttlHours * 60 * 60 * 1000;
    
    return cacheAge <= ttlMs;
  } catch (error) {
    console.error('Error checking cache freshness:', error);
    return false;
  }
}

/**
 * Get cache info (age, size, etc.)
 */
export function getCacheInfo(): {
  exists: boolean;
  ageMinutes: number;
  sizeKB: number;
  lastUpdated: string;
} | null {
  try {
    const storedData = localStorage.getItem(STORAGE_KEY);
    if (!storedData) {
      return null;
    }

    const storedReport: StoredReport = JSON.parse(storedData);
    const now = Date.now();
    const ageMinutes = Math.round((now - storedReport.timestamp) / 1000 / 60);
    const sizeKB = Math.round(new Blob([storedData]).size / 1024);
    const lastUpdated = new Date(storedReport.timestamp).toLocaleString();

    return {
      exists: true,
      ageMinutes,
      sizeKB,
      lastUpdated
    };
  } catch (error) {
    console.error('Error getting cache info:', error);
    return null;
  }
}

/**
 * Clear cached report data
 */
export function clearCache(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    console.log('Cache cleared successfully');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Convert AsanaReport to JSON-serializable format
 */
function reportToJSON(report: AsanaReport): any {
  return {
    sections: report.sections.map(section => ({
      gid: section.gid,
      name: section.name,
      tasks: section.tasks.map(task => ({
        gid: task.gid,
        name: task.name,
        assignee: task.assignee ? {
          gid: task.assignee.gid,
          name: task.assignee.name,
          email: task.assignee.email
        } : null,
        completed: task.completed,
        completed_at: task.completed_at,
        created_at: task.created_at,
        due_on: task.due_on,
        priority: task.priority,
        project: task.project,
        subtasks: task.subtasks.map(subtask => ({
          gid: subtask.gid,
          name: subtask.name,
          assignee: subtask.assignee ? {
            gid: subtask.assignee.gid,
            name: subtask.assignee.name,
            email: subtask.assignee.email
          } : null,
          completed: subtask.completed,
          created_at: subtask.created_at,
          completed_at: subtask.completed_at
        }))
      }))
    })),
    lastUpdated: report.lastUpdated
  };
}

/**
 * Convert JSON data back to AsanaReport instance
 */
function reportFromJSON(data: any): AsanaReport {
  const sections = data.sections.map((sectionData: any) => {
    const tasks = sectionData.tasks.map((taskData: any) => {
      const assignee = taskData.assignee ? 
        new Assignee(taskData.assignee.gid, taskData.assignee.name, taskData.assignee.email) : 
        undefined;

      const subtasks = taskData.subtasks.map((subtaskData: any) => {
        const subtaskAssignee = subtaskData.assignee ? 
          new Assignee(subtaskData.assignee.gid, subtaskData.assignee.name, subtaskData.assignee.email) : 
          undefined;

        return new Subtask(
          subtaskData.gid,
          subtaskData.name,
          subtaskData.completed,
          subtaskAssignee,
          subtaskData.created_at,
          subtaskData.completed_at
        );
      });

      return new Task(
        taskData.gid,
        taskData.name,
        taskData.completed,
        subtasks,
        assignee,
        taskData.completed_at,
        taskData.created_at,
        taskData.due_on,
        taskData.priority,
        taskData.project
      );
    });

    return new Section(sectionData.gid, sectionData.name, tasks);
  });

  const report = new AsanaReport(sections);
  report.lastUpdated = data.lastUpdated;
  return report;
}

/**
 * React hook for managing report cache
 */
export function useReportCache() {
  const save = (report: AsanaReport) => saveReport(report);
  const load = (ttlHours?: number) => loadReport(ttlHours);
  const clear = () => clearCache();
  const isFresh = (ttlHours?: number) => isCacheFresh(ttlHours);
  const getInfo = () => getCacheInfo();

  return {
    save,
    load,
    clear,
    isFresh,
    getInfo
  };
}

/**
 * Save user preferences to Local Storage
 */
export function saveUserPreferences(preferences: {
  selectedAssignee?: string;
  timeRange?: string;
  projectFilter?: string;
  statusFilter?: string;
}): void {
  try {
    const key = 'asana_dashboard_preferences';
    localStorage.setItem(key, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
}

/**
 * Load user preferences from Local Storage
 */
export function loadUserPreferences(): {
  selectedAssignee?: string;
  timeRange?: string;
  projectFilter?: string;
  statusFilter?: string;
} {
  try {
    const key = 'asana_dashboard_preferences';
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error('Error loading user preferences:', error);
    return {};
  }
}