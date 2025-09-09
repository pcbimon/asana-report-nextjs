/**
 * TypeScript data models for Asana Report system
 * Represents the structure of data fetched from Asana API
 */

export class Assignee {
  gid: string;
  name: string;
  email?: string;

  constructor(gid: string, name: string, email?: string) {
    this.gid = gid;
    this.name = name;
    this.email = email;
  }
}

export class Subtask {
  gid: string;
  name: string;
  assignee?: Assignee;
  completed: boolean;
  created_at?: string;
  completed_at?: string;

  constructor(
    gid: string,
    name: string,
    completed: boolean,
    assignee?: Assignee,
    created_at?: string,
    completed_at?: string
  ) {
    this.gid = gid;
    this.name = name;
    this.completed = completed;
    this.assignee = assignee;
    this.created_at = created_at;
    this.completed_at = completed_at;
  }

  /**
   * Calculate the time spent on this subtask in days
   */
  getTimeSpent(): number {
    if (!this.created_at || !this.completed_at) return 0;
    const created = new Date(this.created_at);
    const completed = new Date(this.completed_at);
    return Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if this subtask is overdue
   */
  isOverdue(): boolean {
    // For subtasks, we'll consider them overdue if they're not completed and created more than 7 days ago
    if (this.completed || !this.created_at) return false;
    const created = new Date(this.created_at);
    const now = new Date();
    const daysSinceCreated = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceCreated > 7;
  }
}

export class Task {
  gid: string;
  name: string;
  assignee?: Assignee;
  completed: boolean;
  completed_at?: string;
  created_at?: string;
  due_on?: string;
  priority?: string;
  project?: string;
  subtasks: Subtask[];

  constructor(
    gid: string,
    name: string,
    completed: boolean,
    subtasks: Subtask[] = [],
    assignee?: Assignee,
    completed_at?: string,
    created_at?: string,
    due_on?: string,
    priority?: string,
    project?: string
  ) {
    this.gid = gid;
    this.name = name;
    this.completed = completed;
    this.subtasks = subtasks;
    this.assignee = assignee;
    this.completed_at = completed_at;
    this.created_at = created_at;
    this.due_on = due_on;
    this.priority = priority;
    this.project = project;
  }

  /**
   * Calculate the average time spent on subtasks
   */
  getAverageSubtaskTime(): number {
    const completedSubtasks = this.subtasks.filter(st => st.completed && st.getTimeSpent() > 0);
    if (completedSubtasks.length === 0) return 0;
    
    const totalTime = completedSubtasks.reduce((sum, st) => sum + st.getTimeSpent(), 0);
    return totalTime / completedSubtasks.length;
  }

  /**
   * Check if this task is overdue
   */
  isOverdue(): boolean {
    if (this.completed || !this.due_on) return false;
    const dueDate = new Date(this.due_on);
    const now = new Date();
    return now > dueDate;
  }

  /**
   * Get completion rate of subtasks
   */
  getSubtaskCompletionRate(): number {
    if (this.subtasks.length === 0) return 0;
    const completedCount = this.subtasks.filter(st => st.completed).length;
    return (completedCount / this.subtasks.length) * 100;
  }

  /**
   * Calculate total time spent on this task including subtasks
   */
  getTotalTimeSpent(): number {
    if (this.created_at && this.completed_at) {
      const created = new Date(this.created_at);
      const completed = new Date(this.completed_at);
      return Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    // If task time is not available, calculate from subtasks
    return this.subtasks.reduce((sum, st) => sum + st.getTimeSpent(), 0);
  }
}

export class Section {
  gid: string;
  name: string;
  tasks: Task[];

  constructor(gid: string, name: string, tasks: Task[] = []) {
    this.gid = gid;
    this.name = name;
    this.tasks = tasks;
  }

  /**
   * Get all tasks assigned to a specific assignee
   */
  getTasksForAssignee(assigneeGid: string): Task[] {
    return this.tasks.filter(task => {
      // Check if task is directly assigned to the assignee
      if (task.assignee?.gid === assigneeGid) return true;
      
      // Check if any subtask is assigned to the assignee
      return task.subtasks.some(subtask => subtask.assignee?.gid === assigneeGid);
    });
  }

  /**
   * Get completion rate for this section
   */
  getCompletionRate(): number {
    if (this.tasks.length === 0) return 0;
    const completedTasks = this.tasks.filter(task => task.completed).length;
    return (completedTasks / this.tasks.length) * 100;
  }
}

export class AsanaReport {
  sections: Section[];
  teamUsers: Assignee[]; // Direct team users from API
  lastUpdated: string;

  constructor(sections: Section[] = [], teamUsers: Assignee[] = []) {
    this.sections = sections;
    this.teamUsers = teamUsers;
    this.lastUpdated = new Date().toISOString();
  }

  /**
   * Get all unique assignees from the report
   * Now uses direct team users API instead of deriving from tasks for better performance
   */
  getAllAssignees(): Assignee[] {
    // If we have team users from API, use them first
    if (this.teamUsers.length > 0) {
      return this.teamUsers;
    }

    // Fallback to task-based assignees if team users API is not available
    const assigneeMap = new Map<string, Assignee>();

    this.sections.forEach(section => {
      section.tasks.forEach(task => {
        // Add task assignee
        if (task.assignee) {
          assigneeMap.set(task.assignee.gid, task.assignee);
        }

        // Add subtask assignees
        task.subtasks.forEach(subtask => {
          if (subtask.assignee) {
            assigneeMap.set(subtask.assignee.gid, subtask.assignee);
          }
        });
      });
    });

    return Array.from(assigneeMap.values());
  }

  /**
   * Get all tasks and subtasks for a specific assignee
   */
  getAssigneeData(assigneeGid: string): {
    tasks: Task[];
    subtasks: Subtask[];
    totalTasks: number;
    completedTasks: number;
    overdueTasks: number;
    completionRate: number;
    averageTimePerTask: number;
  } {
    const tasks: Task[] = [];
    const subtasks: Subtask[] = [];

    this.sections.forEach(section => {
      section.tasks.forEach(task => {
        // Check if task is assigned to the assignee
        if (task.assignee?.gid === assigneeGid) {
          tasks.push(task);
        }

        // Check subtasks
        task.subtasks.forEach(subtask => {
          if (subtask.assignee?.gid === assigneeGid) {
            subtasks.push(subtask);
          }
        });
      });
    });

    const totalTasks = tasks.length + subtasks.length;
    const completedTasks = tasks.filter(t => t.completed).length + subtasks.filter(st => st.completed).length;
    const overdueTasks = tasks.filter(t => t.isOverdue()).length + subtasks.filter(st => st.isOverdue()).length;
    const completionRate = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

    // Calculate average time per task
    const completedTasksWithTime = tasks.filter(t => t.completed && t.getTotalTimeSpent() > 0);
    const completedSubtasksWithTime = subtasks.filter(st => st.completed && st.getTimeSpent() > 0);
    
    const totalTimeSpent = 
      completedTasksWithTime.reduce((sum, t) => sum + t.getTotalTimeSpent(), 0) +
      completedSubtasksWithTime.reduce((sum, st) => sum + st.getTimeSpent(), 0);
    
    const totalCompletedWithTime = completedTasksWithTime.length + completedSubtasksWithTime.length;
    const averageTimePerTask = totalCompletedWithTime > 0 ? totalTimeSpent / totalCompletedWithTime : 0;

    return {
      tasks,
      subtasks,
      totalTasks,
      completedTasks,
      overdueTasks,
      completionRate,
      averageTimePerTask
    };
  }

  /**
   * Get weekly task summary for an assignee
   */
  getWeeklyTaskSummary(assigneeGid: string, weeks: number = 12): {
    week: string;
    assigned: number;
    completed: number;
  }[] {
    const assigneeData = this.getAssigneeData(assigneeGid);
    const allItems = [...assigneeData.tasks, ...assigneeData.subtasks];
    
    const weeklyData: { [key: string]: { assigned: number; completed: number } } = {};
    
    // Initialize weeks
    for (let i = 0; i < weeks; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      const weekKey = this.getWeekKey(date);
      weeklyData[weekKey] = { assigned: 0, completed: 0 };
    }

    allItems.forEach(item => {
      // Count assigned items (based on creation date or current week if no date)
      const createdDate = item.created_at ? new Date(item.created_at) : new Date();
      const createdWeek = this.getWeekKey(createdDate);
      if (weeklyData[createdWeek]) {
        weeklyData[createdWeek].assigned++;
      }

      // Count completed items
      if (item.completed && item.completed_at) {
        const completedDate = new Date(item.completed_at);
        const completedWeek = this.getWeekKey(completedDate);
        if (weeklyData[completedWeek]) {
          weeklyData[completedWeek].completed++;
        }
      }
    });

    return Object.keys(weeklyData)
      .sort()
      .map(week => ({
        week,
        assigned: weeklyData[week].assigned,
        completed: weeklyData[week].completed
      }));
  }

  /**
   * Helper method to get week key (YYYY-WW format)
   */
  private getWeekKey(date: Date): string {
    const year = date.getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
    const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return `${year}-${week.toString().padStart(2, '0')}`;
  }

  /**
   * Get task distribution by project/section for an assignee
   */
  getTaskDistributionBySection(assigneeGid: string): { section: string; count: number }[] {
    const distribution: { [key: string]: number } = {};

    this.sections.forEach(section => {
      const assigneeTasks = section.getTasksForAssignee(assigneeGid);
      if (assigneeTasks.length > 0) {
        distribution[section.name] = (distribution[section.name] || 0) + assigneeTasks.length;
      }
    });

    return Object.keys(distribution).map(section => ({
      section,
      count: distribution[section]
    }));
  }

  /**
   * Get task distribution by status for an assignee
   */
  getTaskDistributionByStatus(assigneeGid: string): { status: string; count: number }[] {
    const assigneeData = this.getAssigneeData(assigneeGid);
    const allItems = [...assigneeData.tasks, ...assigneeData.subtasks];
    
    const completed = allItems.filter(item => item.completed).length;
    const overdue = allItems.filter(item => 
      'isOverdue' in item ? item.isOverdue() : false
    ).length;
    const inProgress = allItems.length - completed - overdue;

    return [
      { status: 'Completed', count: completed },
      { status: 'In Progress', count: inProgress },
      { status: 'Overdue', count: overdue }
    ].filter(item => item.count > 0);
  }
}