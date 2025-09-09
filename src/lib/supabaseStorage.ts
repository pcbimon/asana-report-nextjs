/**
 * Supabase Storage utilities for caching Asana report data
 * Replaces localStorage functionality with Supabase database
 */

import { supabase, AsanaReportRecord } from './supabase';
import { AsanaReport, Section, Task, Subtask, Assignee } from '../models/asanaReport';

const DEFAULT_TTL_HOURS = 12; // Default cache TTL: 12 hours

/**
 * Save AsanaReport to Supabase
 */
export async function saveReport(report: AsanaReport): Promise<void> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping save');
    return;
  }

  try {
    const reportData = {
      data: reportToJSON(report),
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };

    // Delete existing reports (keep only the latest)
    await supabase.from('asana_reports').delete().neq('id', 0);

    // Insert new report
    const { error } = await supabase
      .from('asana_reports')
      .insert(reportData);

    if (error) {
      throw error;
    }

    console.log('Report saved to Supabase successfully');
  } catch (error) {
    console.error('Error saving report to Supabase:', error);
    throw new Error('Unable to save report to Supabase');
  }
}

/**
 * Load AsanaReport from Supabase
 * Returns null if cache is expired or doesn't exist
 */
export async function loadReport(ttlHours: number = DEFAULT_TTL_HOURS): Promise<AsanaReport | null> {
  if (!supabase) {
    console.log('Supabase not configured, no cached report available');
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('asana_reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No cached report found');
      return null;
    }

    const storedReport = data[0] as AsanaReportRecord;
    
    // Check if cache is expired
    const now = new Date().getTime();
    const reportTime = new Date(storedReport.timestamp).getTime();
    const cacheAge = now - reportTime;
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
    console.error('Error loading report from Supabase:', error);
    return null;
  }
}

/**
 * Check if cached report exists and is fresh
 */
export async function isCacheFresh(ttlHours: number = DEFAULT_TTL_HOURS): Promise<boolean> {
  if (!supabase) {
    return false;
  }

  try {
    const { data, error } = await supabase
      .from('asana_reports')
      .select('timestamp')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) return false;

    const now = new Date().getTime();
    const reportTime = new Date(data[0].timestamp).getTime();
    const cacheAge = now - reportTime;
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
export async function getCacheInfo(): Promise<{
  exists: boolean;
  ageMinutes: number;
  lastUpdated: string;
} | null> {
  if (!supabase) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('asana_reports')
      .select('timestamp, created_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      return null;
    }

    const storedReport = data[0];
    const now = new Date().getTime();
    const reportTime = new Date(storedReport.timestamp).getTime();
    const ageMinutes = Math.round((now - reportTime) / 1000 / 60);
    const lastUpdated = new Date(storedReport.timestamp).toLocaleString();

    return {
      exists: true,
      ageMinutes,
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
export async function clearCache(): Promise<void> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping clear cache');
    return;
  }

  try {
    const { error } = await supabase.from('asana_reports').delete().neq('id', 0);
    
    if (error) {
      throw error;
    }

    console.log('Cache cleared successfully');
  } catch (error) {
    console.error('Error clearing cache:', error);
  }
}

/**
 * Save user preferences to Supabase
 */
export async function saveUserPreferences(preferences: {
  selectedAssignee?: string;
  timeRange?: string;
  projectFilter?: string;
  statusFilter?: string;
}): Promise<void> {
  if (!supabase) {
    console.warn('Supabase not configured, skipping save preferences');
    return;
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        selected_assignee: preferences.selectedAssignee,
        time_range: preferences.timeRange,
        project_filter: preferences.projectFilter,
        status_filter: preferences.statusFilter
      });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
}

/**
 * Load user preferences from Supabase
 */
export async function loadUserPreferences(): Promise<{
  selectedAssignee?: string;
  timeRange?: string;
  projectFilter?: string;
  statusFilter?: string;
}> {
  if (!supabase) {
    return {};
  }

  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return {};
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error;
    }

    if (!data) {
      return {};
    }

    return {
      selectedAssignee: data.selected_assignee,
      timeRange: data.time_range,
      projectFilter: data.project_filter,
      statusFilter: data.status_filter
    };
  } catch (error) {
    console.error('Error loading user preferences:', error);
    return {};
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