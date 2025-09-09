/**
 * Asana API integration utilities
 * Handles fetching data from Asana API with proper error handling and rate limiting
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { useMemo } from 'react';
import { Assignee, Section, Task, Subtask, AsanaReport } from '../models/asanaReport';

// Progress tracking interface
export interface LoadingProgress {
  current: number;
  total: number;
  percentage: number;
  status: string;
}

// Types for Asana API responses
interface AsanaSection {
  gid: string;
  name: string;
  resource_type: string;
}

interface AsanaTask {
  gid: string;
  name: string;
  assignee?: {
    gid: string;
    name: string;
    email?: string;
  };
  completed?: boolean;
  completed_at?: string;
  created_at?: string;
  due_on?: string;
  priority?: string;
  projects?: Array<{ gid: string; name: string }>;
  num_subtasks?: number;
}

interface AsanaSubtask {
  gid: string;
  name: string;
  assignee?: {
    gid: string;
    name: string;
    email?: string;
  };
  completed: boolean;
  created_at?: string;
  completed_at?: string;
}

interface AsanaTaskCounts {
  num_tasks: number;
}

interface AsanaUser {
  gid: string;
  name: string;
  email?: string;
  resource_type: string;
}

interface AsanaApiResponse<T> {
  data: T;
}

export class AsanaApiClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private token: string;
  private projectId: string;
  private rateLimitDelay: number;
  private progressCallback?: (progress: LoadingProgress) => void;
  private teamUsers: Assignee[] = []; // Cache team users

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_ASANA_BASE_URL || 'https://app.asana.com/api/1.0';
    this.token = process.env.NEXT_PUBLIC_ASANA_TOKEN || '';
    this.projectId = process.env.NEXT_PUBLIC_ASANA_PROJECT_ID || '';

    // Calculate rate limit delay from environment variable
    const rateLimit = parseInt(process.env.RATE_LIMIT || '150', 10); // requests per minute
    this.rateLimitDelay = Math.ceil(60000 / rateLimit); // Convert to milliseconds between requests

    if (!this.token || !this.projectId) {
      throw new Error('Missing required environment variables: NEXT_PUBLIC_ASANA_TOKEN and NEXT_PUBLIC_ASANA_PROJECT_ID');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 seconds timeout
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 429) {
          // Rate limit exceeded, implement exponential backoff
          const retryAfter = error.response.headers['retry-after'] || 60;
          console.warn(`Rate limit exceeded. Retrying after ${retryAfter} seconds.`);
          return new Promise((resolve) => {
            setTimeout(() => resolve(this.client.request(error.config)), retryAfter * 1000);
          });
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Set progress callback for reporting loading progress
   */
  setProgressCallback(callback?: (progress: LoadingProgress) => void): void {
    this.progressCallback = callback;
  }

  /**
   * Update progress and notify callback
   */
  private updateProgress(current: number, total: number, status: string): void {
    if (this.progressCallback) {
      const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
      this.progressCallback({
        current,
        total,
        percentage,
        status
      });
    }
  }

  /**
   * Add delay between requests to respect rate limits
   */
  private async delay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }

  /**
   * Fetch team users (assignees)
   */
  async fetchTeamUsers(): Promise<Assignee[]> {
    try {
      const teamId = process.env.NEXT_PUBLIC_TEAM_ID;
      if (!teamId) {
        console.warn('NEXT_PUBLIC_TEAM_ID not configured, falling back to task-based assignees');
        return [];
      }

      console.log('Fetching team users for team:', teamId);
      const response: AxiosResponse<AsanaApiResponse<AsanaUser[]>> = await this.client.get(
        `/teams/${teamId}/users`,
        {
          params: {
            opt_fields: 'name,email'
          }
        }
      );

      const assignees = response.data.data.map(userData => 
        new Assignee(userData.gid, userData.name, userData.email)
      );

      console.log(`Fetched ${assignees.length} team users`);
      return assignees;
    } catch (error) {
      console.error('Error fetching team users:', error);
      console.warn('Falling back to task-based assignees');
      return [];
    }
  }

  /**
   * Fetch project task counts
   */
  async fetchProjectTaskCounts(): Promise<number> {
    try {
      console.log('Fetching project task counts for project:', this.projectId);
      const response: AxiosResponse<AsanaApiResponse<AsanaTaskCounts>> = await this.client.get(
        `/projects/${this.projectId}/task_counts`,
        {
          params: {
            opt_fields: 'num_tasks'
          }
        }
      );

      const taskCount = response.data.data.num_tasks;
      console.log(`Project has ${taskCount} total tasks`);
      return taskCount;
    } catch (error) {
      console.error('Error fetching project task counts:', error);
      // Fall back to 0 if the API call fails
      return 0;
    }
  }

  /**
   * Fetch task with subtask count
   */
  async fetchTaskWithSubtaskCount(taskGid: string): Promise<number> {
    try {
      const response: AxiosResponse<AsanaApiResponse<AsanaTask>> = await this.client.get(
        `/tasks/${taskGid}`,
        {
          params: {
            opt_fields: 'num_subtasks'
          }
        }
      );

      return response.data.data.num_subtasks || 0;
    } catch (error) {
      console.error(`Error fetching subtask count for task ${taskGid}:`, error);
      // Fall back to 0 if the API call fails
      return 0;
    }
  }
  async fetchSections(): Promise<Section[]> {
    try {
      console.log('Fetching sections for project:', this.projectId);
      const response: AxiosResponse<AsanaApiResponse<AsanaSection[]>> = await this.client.get(
        `/projects/${this.projectId}/sections`
      );

      const sections = response.data.data.map(sectionData => 
        new Section(sectionData.gid, sectionData.name)
      );

      console.log(`Fetched ${sections.length} sections`);
      return sections;
    } catch (error) {
      console.error('Error fetching sections:', error);
      throw new Error(`Failed to fetch sections: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch all tasks in a section
   */
  async fetchTasksInSection(sectionGid: string): Promise<Task[]> {
    try {
      console.log('Fetching tasks for section:', sectionGid);
      await this.delay(); // Rate limiting

      const response: AxiosResponse<AsanaApiResponse<AsanaTask[]>> = await this.client.get(
        `/sections/${sectionGid}/tasks`,
        {
          params: {
            opt_fields: 'name,assignee.name,assignee.email,completed,completed_at,created_at,due_on,projects.name,num_subtasks'
          }
        }
      );

      const tasks = response.data.data.map(taskData => {
        const assignee = taskData.assignee ? 
          new Assignee(taskData.assignee.gid, taskData.assignee.name, taskData.assignee.email) : 
          undefined;

        const project = taskData.projects && taskData.projects.length > 0 ? 
          taskData.projects[0].name : 
          undefined;

        return new Task(
          taskData.gid,
          taskData.name,
          taskData.completed || false,
          [], // Subtasks will be fetched separately
          assignee,
          taskData.completed_at,
          taskData.created_at,
          taskData.due_on,
          taskData.priority,
          project
        );
      });

      console.log(`Fetched ${tasks.length} tasks for section ${sectionGid}`);
      return tasks;
    } catch (error) {
      console.error(`Error fetching tasks for section ${sectionGid}:`, error);
      throw new Error(`Failed to fetch tasks for section ${sectionGid}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch all subtasks for a task
   */
  async fetchSubtasks(taskGid: string): Promise<Subtask[]> {
    try {
      console.log('Fetching subtasks for task:', taskGid);
      await this.delay(); // Rate limiting

      const response: AxiosResponse<AsanaApiResponse<AsanaSubtask[]>> = await this.client.get(
        `/tasks/${taskGid}/subtasks`,
        {
          params: {
            opt_fields: 'name,assignee.name,assignee.email,completed,created_at,completed_at'
          }
        }
      );

      const subtasks = response.data.data.map(subtaskData => {
        const assignee = subtaskData.assignee ? 
          new Assignee(subtaskData.assignee.gid, subtaskData.assignee.name, subtaskData.assignee.email) : 
          undefined;

        return new Subtask(
          subtaskData.gid,
          subtaskData.name,
          subtaskData.completed,
          assignee,
          subtaskData.created_at,
          subtaskData.completed_at
        );
      });

      console.log(`Fetched ${subtasks.length} subtasks for task ${taskGid}`);
      return subtasks;
    } catch (error) {
      console.error(`Error fetching subtasks for task ${taskGid}:`, error);
      // Don't throw error for subtasks - just return empty array
      console.warn(`Continuing without subtasks for task ${taskGid}`);
      return [];
    }
  }

  /**
   * Fetch complete report data from Asana
   */
  async fetchCompleteReport(): Promise<AsanaReport> {
    try {
      console.log('Starting complete report fetch...');
      
      // Step 1: Fetch team users first for efficiency
      this.updateProgress(0, 100, 'Loading team users...');
      this.teamUsers = await this.fetchTeamUsers();
      
      // Step 2: Get exact task count from project API
      this.updateProgress(5, 100, 'Getting project task count...');
      const totalTasksInProject = await this.fetchProjectTaskCounts();
      
      // Step 3: Fetch all sections
      this.updateProgress(10, 100, 'Loading sections...');
      const sections = await this.fetchSections();
      
      // Step 4: Calculate progress based on actual task count
      // Operations: team users (done) + task count (done) + sections (done) + tasks + subtask count checks + subtasks
      const initialWeight = 10; // Already completed
      const tasksWeight = 30; // Loading tasks
      const subtaskCountWeight = 10; // Getting subtask counts
      const subtasksWeight = 50; // Loading actual subtasks
      
      let currentProgress = initialWeight;
      this.updateProgress(currentProgress, 100, `Loading ${totalTasksInProject} tasks across ${sections.length} sections...`);
      
      let totalTasksProcessed = 0;
      let totalSubtasksCount = 0;
      
      // Step 5: Fetch tasks for each section
      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const tasks = await this.fetchTasksInSection(section.gid);
        section.tasks = tasks;
        totalTasksProcessed += tasks.length;
        
        // Update progress for tasks loading
        const taskProgress = totalTasksInProject > 0 ? 
          (totalTasksProcessed / totalTasksInProject) * tasksWeight : 
          tasksWeight;
        currentProgress = initialWeight + taskProgress;
        
        this.updateProgress(currentProgress, 100, 
          `Loading tasks in '${section.name}' (${totalTasksProcessed}/${totalTasksInProject})...`);
      }
      
      // Step 6: Get subtask counts for accurate progress calculation
      currentProgress = initialWeight + tasksWeight;
      this.updateProgress(currentProgress, 100, 'Calculating subtask counts...');
      
      const allTasks = sections.flatMap(section => section.tasks);
      let subtaskCountsProcessed = 0;
      
      // Get subtask counts for all tasks
      for (const task of allTasks) {
        const subtaskCount = await this.fetchTaskWithSubtaskCount(task.gid);
        totalSubtasksCount += subtaskCount;
        subtaskCountsProcessed++;
        
        // Update progress for subtask count checks
        const subtaskCountProgress = allTasks.length > 0 ? 
          (subtaskCountsProcessed / allTasks.length) * subtaskCountWeight : 
          subtaskCountWeight;
        currentProgress = initialWeight + tasksWeight + subtaskCountProgress;
        
        if (subtaskCountsProcessed % 5 === 0 || subtaskCountsProcessed === allTasks.length) {
          this.updateProgress(currentProgress, 100, 
            `Calculating subtask counts (${subtaskCountsProcessed}/${allTasks.length})...`);
        }
      }
      
      // Step 7: Fetch actual subtasks
      currentProgress = initialWeight + tasksWeight + subtaskCountWeight;
      this.updateProgress(currentProgress, 100, 
        `Loading ${totalSubtasksCount} subtasks for ${allTasks.length} tasks...`);
      
      let subtasksProcessed = 0;
      
      for (const section of sections) {
        for (const task of section.tasks) {
          const subtasks = await this.fetchSubtasks(task.gid);
          task.subtasks = subtasks;
          subtasksProcessed += subtasks.length;
          
          // Update progress for subtasks loading
          const subtaskProgress = totalSubtasksCount > 0 ? 
            (subtasksProcessed / totalSubtasksCount) * subtasksWeight : 
            subtasksWeight / allTasks.length * (allTasks.indexOf(task) + 1);
          currentProgress = initialWeight + tasksWeight + subtaskCountWeight + subtaskProgress;
          
          this.updateProgress(currentProgress, 100, 
            `Loading subtasks for '${task.name}' (${subtasksProcessed}/${totalSubtasksCount})...`);
        }
      }

      const report = new AsanaReport(sections, this.teamUsers);
      
      // Final progress update
      this.updateProgress(100, 100, 'Report loaded successfully!');
      
      console.log('Report fetch completed successfully');
      
      // Log summary
      const totalTasksActual = sections.reduce((sum, section) => sum + section.tasks.length, 0);
      const totalSubtasksActual = sections.reduce((sum, section) => 
        sum + section.tasks.reduce((taskSum, task) => taskSum + task.subtasks.length, 0), 0
      );
      
      console.log(`Report summary: ${sections.length} sections, ${totalTasksActual} tasks, ${totalSubtasksActual} subtasks, ${this.teamUsers.length} team users`);
      console.log(`Accuracy: Predicted ${totalTasksInProject} tasks (actual: ${totalTasksActual}), predicted ${totalSubtasksCount} subtasks (actual: ${totalSubtasksActual})`);
      
      return report;
    } catch (error) {
      console.error('Error fetching complete report:', error);
      throw new Error(`Failed to fetch complete report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/users/me');
      console.log('API connection test successful:', response.data.data.name);
      return true;
    } catch (error) {
      console.error('API connection test failed:', error);
      return false;
    }
  }
}

// Singleton instance
let apiClientInstance: AsanaApiClient | null = null;

/**
 * Get singleton instance of AsanaApiClient
 */
export function getAsanaApiClient(): AsanaApiClient {
  if (!apiClientInstance) {
    apiClientInstance = new AsanaApiClient();
  }
  return apiClientInstance;
}

/**
 * Hook for use in React components
 */
export function useAsanaApi() {
  // Return memoized API methods to prevent re-creation on every render
  return useMemo(() => {
    const client = getAsanaApiClient();
    return {
      fetchCompleteReport: () => client.fetchCompleteReport(),
      fetchTeamUsers: () => client.fetchTeamUsers(),
      testConnection: () => client.testConnection(),
    };
  }, []); // Empty dependency array since the client is a singleton
}