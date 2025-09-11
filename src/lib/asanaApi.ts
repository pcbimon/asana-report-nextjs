// Note: This file is now server-side only and should not be imported in client components
// Use the API routes in /app/api/asana/* for client-side data fetching

/**
 * Asana API integration utilities - SERVER SIDE ONLY
 * Handles fetching data from Asana API with proper error handling and rate limiting
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Assignee, Section, Task, Subtask, Follower, AsanaReport } from '../models/asanaReport';

// Progress tracking interface
export interface LoadingProgress {
  current: number;
  total: number;
  percentage: number;
  status: string;
  // New detailed progress fields
  sections?: { loaded: number; total: number };
  tasks?: { loaded: number; total: number };
  subtasks?: { loaded: number; total: number };
  teamUsers?: { loaded: number; total: number };
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
  followers?: Array<{
    gid: string;
    name: string;
  }>;
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
  private maxConcurrentRequests: number = 5; // For parallel loading

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_ASANA_BASE_URL || 'https://app.asana.com/api/1.0';
    this.token = process.env.ASANA_TOKEN || '';
    this.projectId = process.env.ASANA_PROJECT_ID || '';

    // Calculate rate limit delay from environment variable
    const rateLimit = parseInt(process.env.RATE_LIMIT || '150', 10); // requests per minute
    this.rateLimitDelay = Math.ceil(60000 / rateLimit); // Convert to milliseconds between requests
    if (!this.token || !this.projectId) {
      throw new Error('Missing required environment variables: ASANA_TOKEN and ASANA_PROJECT_ID');
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
   * Update progress and notify callback with detailed counts
   */
  private updateProgress(current: number, total: number, status: string, details?: {
    sections?: { loaded: number; total: number };
    tasks?: { loaded: number; total: number };
    subtasks?: { loaded: number; total: number };
    teamUsers?: { loaded: number; total: number };
  }): void {
    if (this.progressCallback) {
      const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
      this.progressCallback({
        current,
        total,
        percentage,
        status,
        ...details
      });
    }
  }

  /**
   * Execute promises in parallel with rate limiting
   */
  private async executeInParallel<T, R>(
    items: T[],
    executor: (item: T) => Promise<R>,
    maxConcurrency: number = this.maxConcurrentRequests,
    progressCallback?: (completed: number, total: number) => void
  ): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let completed = 0;
    let index = 0;

    const executeNext = async (): Promise<void> => {
      if (index >= items.length) return;
      
      const currentIndex = index++;
      const item = items[currentIndex];
      
      try {
        await this.delay(); // Rate limiting
        const result = await executor(item);
        results[currentIndex] = result;
      } catch (error) {
        console.error(`Error processing item ${currentIndex}:`, error);
        // Set default value for failed items
        results[currentIndex] = null as any;
      }
      
      completed++;
      progressCallback?.(completed, items.length);
      
      // Continue with next item
      return executeNext();
    };

    // Start parallel execution up to maxConcurrency
    const workers = Array(Math.min(maxConcurrency, items.length))
      .fill(null)
      .map(() => executeNext());

    await Promise.all(workers);
    return results.filter(r => r !== null);
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
      const teamId = process.env.ASANA_TEAM_ID;
      if (!teamId) {
        console.warn('ASANA_TEAM_ID not configured, falling back to task-based assignees');
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
            opt_fields: 'name,assignee.name,assignee.email,completed,created_at,completed_at,followers.name'
          }
        }
      );

      const subtasks = response.data.data.map(subtaskData => {
        const assignee = subtaskData.assignee ? 
          new Assignee(subtaskData.assignee.gid, subtaskData.assignee.name, subtaskData.assignee.email) : 
          undefined;

        const followers = subtaskData.followers?.map(followerData =>
          new Follower(followerData.gid, followerData.name)
        ) || [];

        return new Subtask(
          subtaskData.gid,
          subtaskData.name,
          subtaskData.completed,
          assignee,
          followers,
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
   * Fetch complete report data from Asana with optimized parallel loading
   */
  async fetchCompleteReport(): Promise<AsanaReport> {
    try {
      console.log('Starting optimized complete report fetch...');
      
      // Step 1: Initialize progress with detailed counts
      this.updateProgress(0, 100, 'เริ่มต้นโหลดข้อมูล...', {
        teamUsers: { loaded: 0, total: 0 },
        sections: { loaded: 0, total: 0 },
        tasks: { loaded: 0, total: 0 },
        subtasks: { loaded: 0, total: 0 }
      });
      
      // Step 2: Fetch team users and sections in parallel
      this.updateProgress(5, 100, 'โหลดข้อมูลผู้ใช้และแผนกแบบขนาน...');
      
      const [teamUsers, sections] = await Promise.all([
        this.fetchTeamUsers(),
        this.fetchSections()
      ]);
      
      this.teamUsers = teamUsers;
      console.log(`Loaded ${teamUsers.length} team users and ${sections.length} sections in parallel`);
      
      // Update progress with actual counts
      this.updateProgress(15, 100, 'โหลดแผนกและผู้ใช้เสร็จสิ้น', {
        teamUsers: { loaded: teamUsers.length, total: teamUsers.length },
        sections: { loaded: sections.length, total: sections.length },
        tasks: { loaded: 0, total: 0 },
        subtasks: { loaded: 0, total: 0 }
      });
      
      // Step 3: Get project task count estimate
      this.updateProgress(20, 100, 'ประเมินจำนวนงานทั้งหมด...');
      const estimatedTaskCount = await this.fetchProjectTaskCounts();
      
      // Step 4: Load tasks for all sections in parallel
      this.updateProgress(25, 100, `โหลด ${estimatedTaskCount} งานแบบขนาน...`, {
        teamUsers: { loaded: teamUsers.length, total: teamUsers.length },
        sections: { loaded: sections.length, total: sections.length },
        tasks: { loaded: 0, total: estimatedTaskCount },
        subtasks: { loaded: 0, total: 0 }
      });
      
      let totalTasksLoaded = 0;
      
      // Load tasks for all sections in parallel with progress tracking
      const taskLoadingPromises = sections.map(async (section, index) => {
        const tasks = await this.fetchTasksInSection(section.gid);
        section.tasks = tasks;
        totalTasksLoaded += tasks.length;
        
        // Update progress for this section (more frequent updates)
        const sectionProgress = ((index + 1) / sections.length) * 25;
        const progressPercent = 25 + sectionProgress;
        this.updateProgress(progressPercent, 100, `โหลดงานใน '${section.name}' เสร็จสิ้น (${index + 1}/${sections.length})`, {
          teamUsers: { loaded: teamUsers.length, total: teamUsers.length },
          sections: { loaded: sections.length, total: sections.length },
          tasks: { loaded: totalTasksLoaded, total: Math.max(estimatedTaskCount, totalTasksLoaded) },
          subtasks: { loaded: 0, total: 0 }
        });
        
        return section;
      });
      
      // Wait for all task loading to complete
      await Promise.all(taskLoadingPromises);
      
      const allTasks = sections.flatMap(section => section.tasks);
      const actualTaskCount = allTasks.length;
      
      console.log(`Loaded ${actualTaskCount} tasks (estimated: ${estimatedTaskCount})`);
      
      // Step 5: Get subtask counts in parallel batches
      this.updateProgress(50, 100, `ตรวจสอบจำนวนงานย่อยสำหรับ ${actualTaskCount} งาน...`, {
        teamUsers: { loaded: teamUsers.length, total: teamUsers.length },
        sections: { loaded: sections.length, total: sections.length },
        tasks: { loaded: actualTaskCount, total: actualTaskCount },
        subtasks: { loaded: 0, total: 0 }
      });
      
      // Batch subtask count requests for better performance
      const batchSize = 10;
      let totalSubtasksEstimate = 0;
      let subtaskCountsProcessed = 0;
      
      for (let i = 0; i < allTasks.length; i += batchSize) {
        const batch = allTasks.slice(i, Math.min(i + batchSize, allTasks.length));
        
        const subtaskCounts = await this.executeInParallel(
          batch,
          (task) => this.fetchTaskWithSubtaskCount(task.gid),
          Math.min(batchSize, this.maxConcurrentRequests)
        );
        
        totalSubtasksEstimate += subtaskCounts.reduce((sum, count) => sum + count, 0);
        subtaskCountsProcessed += batch.length;
        
        const progressPercent = 50 + (subtaskCountsProcessed / actualTaskCount) * 15;
        this.updateProgress(progressPercent, 100, 
          `ตรวจสอบงานย่อย (${subtaskCountsProcessed}/${actualTaskCount})...`, {
          teamUsers: { loaded: teamUsers.length, total: teamUsers.length },
          sections: { loaded: sections.length, total: sections.length },
          tasks: { loaded: actualTaskCount, total: actualTaskCount },
          subtasks: { loaded: 0, total: totalSubtasksEstimate }
        });
      }
      
      console.log(`Estimated ${totalSubtasksEstimate} subtasks across ${actualTaskCount} tasks`);
      
      // Step 6: Load subtasks in parallel batches
      this.updateProgress(65, 100, `โหลด ${totalSubtasksEstimate} งานย่อยแบบขนาน...`, {
        teamUsers: { loaded: teamUsers.length, total: teamUsers.length },
        sections: { loaded: sections.length, total: sections.length },
        tasks: { loaded: actualTaskCount, total: actualTaskCount },
        subtasks: { loaded: 0, total: totalSubtasksEstimate }
      });
      
      let totalSubtasksLoaded = 0;
      
      // Process tasks in smaller batches to respect rate limits and provide frequent updates
      const subtaskBatchSize = 8;
      let batchIndex = 0;
      const totalBatches = Math.ceil(allTasks.length / subtaskBatchSize);
      
      for (let i = 0; i < allTasks.length; i += subtaskBatchSize) {
        const batch = allTasks.slice(i, Math.min(i + subtaskBatchSize, allTasks.length));
        batchIndex++;
        
        await this.executeInParallel(
          batch,
          async (task) => {
            const subtasks = await this.fetchSubtasks(task.gid);
            task.subtasks = subtasks;
            return subtasks;
          },
          Math.min(subtaskBatchSize, this.maxConcurrentRequests)
        );
        
        // Update total loaded count
        totalSubtasksLoaded = sections.reduce((sum, section) => 
          sum + section.tasks.reduce((taskSum, task) => taskSum + task.subtasks.length, 0), 0
        );
        
        // More frequent progress updates based on batch completion
        const batchProgress = (batchIndex / totalBatches) * 30;
        const progressPercent = 65 + batchProgress;
        this.updateProgress(progressPercent, 100, 
          `โหลดงานย่อย (แบทช์ ${batchIndex}/${totalBatches})...`, {
          teamUsers: { loaded: teamUsers.length, total: teamUsers.length },
          sections: { loaded: sections.length, total: sections.length },
          tasks: { loaded: actualTaskCount, total: actualTaskCount },
          subtasks: { loaded: totalSubtasksLoaded, total: Math.max(totalSubtasksEstimate, totalSubtasksLoaded) }
        });
      }
      
      // Step 7: Create and return report
      const report = new AsanaReport(sections, this.teamUsers);
      
      // Final progress update with actual counts
      const finalSubtaskCount = sections.reduce((sum, section) => 
        sum + section.tasks.reduce((taskSum, task) => taskSum + task.subtasks.length, 0), 0
      );
      
      this.updateProgress(100, 100, 'โหลดข้อมูลเสร็จสิ้น!', {
        teamUsers: { loaded: teamUsers.length, total: teamUsers.length },
        sections: { loaded: sections.length, total: sections.length },
        tasks: { loaded: actualTaskCount, total: actualTaskCount },
        subtasks: { loaded: finalSubtaskCount, total: finalSubtaskCount }
      });
      
      console.log('Optimized report fetch completed successfully');
      console.log(`Final counts: ${sections.length} sections, ${actualTaskCount} tasks, ${finalSubtaskCount} subtasks, ${teamUsers.length} team users`);
      console.log(`Performance: Estimated ${totalSubtasksEstimate} subtasks (actual: ${finalSubtaskCount})`);
      
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

// Note: Singleton pattern and React hooks removed - this is now server-side only
// For client-side usage, use the API routes and useAsanaDataApi hook