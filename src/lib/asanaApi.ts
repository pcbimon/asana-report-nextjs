/**
 * Asana API integration utilities
 * Handles fetching data from Asana API with proper error handling and rate limiting
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Assignee, Section, Task, Subtask, AsanaReport } from '../models/asanaReport';

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

interface AsanaApiResponse<T> {
  data: T;
}

export class AsanaApiClient {
  private client: AxiosInstance;
  private baseUrl: string;
  private token: string;
  private projectId: string;
  private rateLimitDelay: number = 1000; // 1 second delay between requests

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_ASANA_BASE_URL || 'https://app.asana.com/api/1.0';
    this.token = process.env.NEXT_PUBLIC_ASANA_TOKEN || '';
    this.projectId = process.env.NEXT_PUBLIC_ASANA_PROJECT_ID || '';

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
   * Add delay between requests to respect rate limits
   */
  private async delay(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.rateLimitDelay));
  }

  /**
   * Fetch all sections in the project
   */
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
            opt_fields: 'name,assignee.name,assignee.email,completed,completed_at,created_at,due_on,projects.name'
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
      
      // Step 1: Fetch all sections
      const sections = await this.fetchSections();
      
      // Step 2: Fetch tasks for each section
      for (const section of sections) {
        const tasks = await this.fetchTasksInSection(section.gid);
        section.tasks = tasks;
        
        // Step 3: Fetch subtasks for each task
        for (const task of tasks) {
          const subtasks = await this.fetchSubtasks(task.gid);
          task.subtasks = subtasks;
        }
      }

      const report = new AsanaReport(sections);
      console.log('Report fetch completed successfully');
      
      // Log summary
      const totalTasks = sections.reduce((sum, section) => sum + section.tasks.length, 0);
      const totalSubtasks = sections.reduce((sum, section) => 
        sum + section.tasks.reduce((taskSum, task) => taskSum + task.subtasks.length, 0), 0
      );
      
      console.log(`Report summary: ${sections.length} sections, ${totalTasks} tasks, ${totalSubtasks} subtasks`);
      
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
  const client = getAsanaApiClient();
  
  return {
    fetchCompleteReport: () => client.fetchCompleteReport(),
    testConnection: () => client.testConnection(),
  };
}