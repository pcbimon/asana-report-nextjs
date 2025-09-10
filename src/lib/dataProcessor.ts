/**
 * Data processing utilities for Asana report data
 * Handles data aggregation, filtering, and calculations
 */

import { AsanaReport, Assignee, Task, Subtask } from '../models/asanaReport';
import dayjs from 'dayjs';
import weekOfYear from 'dayjs/plugin/weekOfYear';
import isoWeek from 'dayjs/plugin/isoWeek';

dayjs.extend(weekOfYear);
dayjs.extend(isoWeek);

export interface AssigneeStats {
  assignee: Assignee;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  completionRate: number;
  averageTimePerTask: number;
  weeklyData: WeeklyTaskData[];
  monthlyData: MonthlyTaskData[];
  projectDistribution: ProjectDistribution[];
  statusDistribution: StatusDistribution[];
}

export interface WeeklyTaskData {
  week: string;
  weekStart: string;
  assigned: number;
  completed: number;
}

export interface MonthlyTaskData {
  month: string;
  monthStart: string;
  assigned: number;
  completed: number;
}

export interface ProjectDistribution {
  project: string;
  count: number;
  percentage: number;
}

export interface StatusDistribution {
  status: 'Completed' | 'In Progress' | 'Overdue' | 'Not Started';
  count: number;
  percentage: number;
}

export interface TeamAverages {
  averageCompletionRate: number;
  averageTasksPerWeek: number;
  averageTimePerTask: number;
  totalTeamMembers: number;
}

/**
 * Process complete assignee statistics
 */
export function processAssigneeStats(
  report: AsanaReport, 
  assigneeGid: string,
  weeksToAnalyze: number = 52
): AssigneeStats | null {
  const userData = report.getUserData(assigneeGid);
  const assignee = report.getAllAssignees().find(a => a.gid === assigneeGid);
  
  if (!assignee) {
    return null;
  }

  // Combine assignee and collaborator tasks for complete view
  const allTasks = [...userData.assigneeData.tasks, ...userData.collaboratorData.tasks];
  const allSubtasks = [...userData.assigneeData.subtasks, ...userData.collaboratorData.subtasks];

  const weeklyData = generateWeeklyData(allTasks, allSubtasks, weeksToAnalyze);
  const monthlyData = generateMonthlyData(allTasks, allSubtasks, 12); // 12 months
  const projectDistribution = generateProjectDistribution(allTasks, allSubtasks, report);
  const statusDistribution = generateStatusDistribution(allTasks, allSubtasks);

  return {
    assignee,
    totalTasks: userData.combined.totalTasks,
    completedTasks: userData.combined.completedTasks,
    overdueTasks: userData.combined.overdueTasks,
    completionRate: userData.combined.completionRate,
    averageTimePerTask: (userData.assigneeData.averageTimePerTask + userData.collaboratorData.averageTimePerTask) / 2,
    weeklyData,
    monthlyData,
    projectDistribution,
    statusDistribution
  };
}

/**
 * Calculate team averages for comparison
 */
export function calculateTeamAverages(report: AsanaReport): TeamAverages {
  const allAssignees = report.getAllAssignees();
  const assigneeStats = allAssignees.map(assignee => 
    report.getAssigneeData(assignee.gid)
  );

  const totalMembers = assigneeStats.length;
  const averageCompletionRate = totalMembers > 0 ? 
    assigneeStats.reduce((sum, stats) => sum + stats.completionRate, 0) / totalMembers : 0;

  const averageTimePerTask = assigneeStats
    .filter(stats => stats.averageTimePerTask > 0)
    .reduce((sum, stats, _, arr) => sum + stats.averageTimePerTask / arr.length, 0);

  // Calculate average tasks per week
  const allWeeklyData = assigneeStats.map(stats => {
    const weeklyData = generateWeeklyData(stats.tasks, stats.subtasks, 4); // Last 4 weeks
    return weeklyData.reduce((sum, week) => sum + week.assigned, 0) / weeklyData.length;
  });
  
  const averageTasksPerWeek = totalMembers > 0 ?
    allWeeklyData.reduce((sum, avg) => sum + avg, 0) / totalMembers : 0;

  return {
    averageCompletionRate,
    averageTasksPerWeek,
    averageTimePerTask,
    totalTeamMembers: totalMembers
  };
}

/**
 * Generate weekly task data
 */
function generateWeeklyData(
  tasks: Task[], 
  subtasks: Subtask[], 
  weeks: number
): WeeklyTaskData[] {
  const weeklyMap = new Map<string, { assigned: number; completed: number; weekStart: string }>();
  
  // Initialize weeks
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = dayjs().subtract(i, 'week').startOf('isoWeek');
    const weekKey = weekStart.format('YYYY') + '-W' + weekStart.isoWeek().toString().padStart(2, '0');
    weeklyMap.set(weekKey, {
      assigned: 0,
      completed: 0,
      weekStart: weekStart.format('YYYY-MM-DD')
    });
  }

  // Process tasks
  [...tasks, ...subtasks].forEach(item => {
    // Count assigned (based on creation date)
    if (item.created_at) {
      const createdDate = dayjs(item.created_at).startOf('isoWeek');
      const createdWeek = createdDate.format('YYYY') + '-W' + createdDate.isoWeek().toString().padStart(2, '0');
      const weekData = weeklyMap.get(createdWeek);
      if (weekData) {
        weekData.assigned++;
      }
    }

    // Count completed
    if (item.completed && item.completed_at) {
      const completedDate = dayjs(item.completed_at).startOf('isoWeek');
      const completedWeek = completedDate.format('YYYY') + '-W' + completedDate.isoWeek().toString().padStart(2, '0');
      const weekData = weeklyMap.get(completedWeek);
      if (weekData) {
        weekData.completed++;
      }
    }
  });

  return Array.from(weeklyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, data]) => ({
      week,
      weekStart: data.weekStart,
      assigned: data.assigned,
      completed: data.completed
    }));
}

/**
 * Generate monthly task data
 */
function generateMonthlyData(
  tasks: Task[], 
  subtasks: Subtask[], 
  months: number
): MonthlyTaskData[] {
  const monthlyMap = new Map<string, { assigned: number; completed: number; monthStart: string }>();
  
  // Initialize months
  for (let i = months - 1; i >= 0; i--) {
    const monthStart = dayjs().subtract(i, 'month').startOf('month');
    const monthKey = monthStart.format('YYYY-MM');
    monthlyMap.set(monthKey, {
      assigned: 0,
      completed: 0,
      monthStart: monthStart.format('YYYY-MM-DD')
    });
  }

  // Process tasks
  [...tasks, ...subtasks].forEach(item => {
    // Count assigned (based on creation date)
    if (item.created_at) {
      const createdMonth = dayjs(item.created_at).startOf('month').format('YYYY-MM');
      const monthData = monthlyMap.get(createdMonth);
      if (monthData) {
        monthData.assigned++;
      }
    }

    // Count completed
    if (item.completed && item.completed_at) {
      const completedMonth = dayjs(item.completed_at).startOf('month').format('YYYY-MM');
      const monthData = monthlyMap.get(completedMonth);
      if (monthData) {
        monthData.completed++;
      }
    }
  });

  return Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      monthStart: data.monthStart,
      assigned: data.assigned,
      completed: data.completed
    }));
}

/**
 * Generate project distribution data
 */
function generateProjectDistribution(
  tasks: Task[], 
  subtasks: Subtask[], 
  report: AsanaReport
): ProjectDistribution[] {
  const projectMap = new Map<string, number>();
  
  // Count tasks by project/section
  tasks.forEach(task => {
    const project = task.project || 'Unassigned';
    projectMap.set(project, (projectMap.get(project) || 0) + 1);
  });

  // For subtasks, we need to find their parent task's project
  subtasks.forEach(subtask => {
    // Find parent task
    let parentProject = 'Unassigned';
    for (const section of report.sections) {
      for (const task of section.tasks) {
        if (task.subtasks.some(st => st.gid === subtask.gid)) {
          parentProject = task.project || section.name || 'Unassigned';
          break;
        }
      }
    }
    projectMap.set(parentProject, (projectMap.get(parentProject) || 0) + 1);
  });

  const total = Array.from(projectMap.values()).reduce((sum, count) => sum + count, 0);
  
  return Array.from(projectMap.entries())
    .map(([project, count]) => ({
      project,
      count,
      percentage: total > 0 ? (count / total) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * Generate status distribution data
 */
function generateStatusDistribution(tasks: Task[], subtasks: Subtask[]): StatusDistribution[] {
  const allItems = [...tasks, ...subtasks];
  const total = allItems.length;
  
  const completed = allItems.filter(item => item.completed).length;
  const overdue = allItems.filter(item => {
    if ('isOverdue' in item && typeof item.isOverdue === 'function') {
      return item.isOverdue();
    }
    // For subtasks, check if created more than 7 days ago and not completed
    if (!item.completed && item.created_at) {
      const daysSince = dayjs().diff(dayjs(item.created_at), 'day');
      return daysSince > 7;
    }
    return false;
  }).length;
  
  const inProgress = total - completed - overdue;

  const statusData: StatusDistribution[] = [
    {
      status: 'Completed',
      count: completed,
      percentage: total > 0 ? (completed / total) * 100 : 0
    },
    {
      status: 'In Progress',
      count: inProgress,
      percentage: total > 0 ? (inProgress / total) * 100 : 0
    },
    {
      status: 'Overdue',
      count: overdue,
      percentage: total > 0 ? (overdue / total) * 100 : 0
    }
  ];

  return statusData.filter(item => item.count > 0);
}

/**
 * Generate calendar data for calendar view
 */
export function generateCalendarData(
  tasks: Task[], 
  subtasks: Subtask[],
  monthsToShow: number = 3
): CalendarDay[] {
  const itemMap = new Map<string, CalendarDay>();

  // Initialize calendar days
  for (let i = monthsToShow - 1; i >= 0; i--) {
    const monthStart = dayjs().subtract(i, 'month').startOf('month');
    const monthEnd = monthStart.endOf('month');
    
    let current = monthStart;
    while (current.isBefore(monthEnd) || current.isSame(monthEnd, 'day')) {
      const dateKey = current.format('YYYY-MM-DD');
      itemMap.set(dateKey, {
        date: dateKey,
        tasks: 0,
        completed: 0,
        overdue: 0,
        items: []
      });
      current = current.add(1, 'day');
    }
  }

  // Process items
  [...tasks, ...subtasks].forEach(item => {
    // Add to creation date
    if (item.created_at) {
      const dateKey = dayjs(item.created_at).format('YYYY-MM-DD');
      const dayData = itemMap.get(dateKey);
      if (dayData) {
        dayData.tasks++;
        dayData.items.push({
          name: item.name,
          completed: item.completed,
          isOverdue: 'isOverdue' in item ? item.isOverdue() : false
        });
      }
    }

    // Add to completion date
    if (item.completed && item.completed_at) {
      const dateKey = dayjs(item.completed_at).format('YYYY-MM-DD');
      const dayData = itemMap.get(dateKey);
      if (dayData) {
        dayData.completed++;
      }
    }

    // Check for overdue items
    if ('isOverdue' in item && item.isOverdue()) {
      const dateKey = dayjs().format('YYYY-MM-DD');
      const dayData = itemMap.get(dateKey);
      if (dayData) {
        dayData.overdue++;
      }
    }
  });

  return Array.from(itemMap.values()).sort((a, b) => a.date.localeCompare(b.date));
}

export interface CalendarDay {
  date: string;
  tasks: number;
  completed: number;
  overdue: number;
  items: Array<{
    name: string;
    completed: boolean;
    isOverdue: boolean;
  }>;
}

/**
 * Filter and search functions
 */
export function filterTasksByDateRange(
  tasks: Task[], 
  subtasks: Subtask[], 
  startDate: string, 
  endDate: string
): { tasks: Task[]; subtasks: Subtask[] } {
  const start = dayjs(startDate);
  const end = dayjs(endDate);

  const filteredTasks = tasks.filter(task => {
    if (task.created_at) {
      const created = dayjs(task.created_at);
      return created.isAfter(start) && created.isBefore(end);
    }
    return false;
  });

  const filteredSubtasks = subtasks.filter(subtask => {
    if (subtask.created_at) {
      const created = dayjs(subtask.created_at);
      return created.isAfter(start) && created.isBefore(end);
    }
    return false;
  });

  return { tasks: filteredTasks, subtasks: filteredSubtasks };
}

/**
 * Search tasks and subtasks by name
 */
export function searchItems(
  tasks: Task[], 
  subtasks: Subtask[], 
  searchTerm: string
): { tasks: Task[]; subtasks: Subtask[] } {
  const term = searchTerm.toLowerCase();

  const filteredTasks = tasks.filter(task => 
    task.name.toLowerCase().includes(term)
  );

  const filteredSubtasks = subtasks.filter(subtask => 
    subtask.name.toLowerCase().includes(term)
  );

  return { tasks: filteredTasks, subtasks: filteredSubtasks };
}

/**
 * Generate performance comparison data for radar chart
 */
export function generatePerformanceComparison(
  assigneeStats: AssigneeStats,
  teamAverages: TeamAverages
): PerformanceMetric[] {
  return [
    {
      metric: 'Completion Rate',
      assigneeValue: assigneeStats.completionRate,
      teamAverage: teamAverages.averageCompletionRate,
      maxValue: 100
    },
    {
      metric: 'Task Velocity',
      assigneeValue: assigneeStats.weeklyData.slice(-4).reduce((sum, week) => sum + week.completed, 0) / 4,
      teamAverage: teamAverages.averageTasksPerWeek,
      maxValue: Math.max(
        assigneeStats.weeklyData.slice(-4).reduce((sum, week) => sum + week.completed, 0) / 4,
        teamAverages.averageTasksPerWeek
      ) * 1.2
    },
    {
      metric: 'Time Efficiency',
      assigneeValue: assigneeStats.averageTimePerTask > 0 ? 
        (teamAverages.averageTimePerTask / assigneeStats.averageTimePerTask) * 100 : 100,
      teamAverage: 100,
      maxValue: 150
    }
  ];
}

export interface PerformanceMetric {
  metric: string;
  assigneeValue: number;
  teamAverage: number;
  maxValue: number;
}