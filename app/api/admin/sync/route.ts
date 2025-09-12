/**
 * API route for Asana data synchronization
 * This replaces the Supabase Edge Function with a direct Next.js API implementation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Types for Asana data structures
interface AsanaAssignee {
  gid: string;
  name: string;
  email?: string;
}

interface AsanaFollower {
  gid: string;
  name: string;
}

interface AsanaSubtask {
  gid: string;
  name: string;
  assignee?: AsanaAssignee;
  followers: AsanaFollower[];
  completed: boolean;
  created_at?: string;
  completed_at?: string;
  due_on?: string;
  project?: string;
  priority?: string;
}

interface AsanaTask {
  gid: string;
  name: string;
  assignee?: AsanaAssignee;
  completed: boolean;
  completed_at?: string;
  created_at?: string;
  due_on?: string;
  priority?: string;
  project?: string;
  subtasks: AsanaSubtask[];
}

interface AsanaSection {
  gid: string;
  name: string;
  tasks: AsanaTask[];
}

interface AsanaReport {
  sections: AsanaSection[];
  lastUpdated: string;
  teamUsers?: AsanaAssignee[];
}

interface AsanaApiConfig {
  token: string;
  projectId: string;
  teamId: string;
  rateLimit: number;
}

/**
 * Asana API client for server-side data fetching
 */
class AsanaApiClient {
  private config: AsanaApiConfig;
  private baseUrl = 'https://app.asana.com/api/1.0';

  constructor(config: AsanaApiConfig) {
    this.config = config;
  }

  private async makeRequest<T>(endpoint: string): Promise<T> {
    const delay = 60000 / this.config.rateLimit; // Rate limiting delay
    
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: {
        'Authorization': `Bearer ${this.config.token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Asana API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return data;
  }

  async fetchTeamUsers(): Promise<AsanaAssignee[]> {
    console.log('Fetching team users...');
    const response = await this.makeRequest<any>(`/teams/${this.config.teamId}/users`);
    
    return response.data.map((user: any) => ({
      gid: user.gid,
      name: user.name,
      email: user.email || undefined
    }));
  }

  async fetchSections(): Promise<{ gid: string; name: string }[]> {
    console.log('Fetching project sections...');
    const response = await this.makeRequest<any>(`/projects/${this.config.projectId}/sections`);
    
    return response.data.map((section: any) => ({
      gid: section.gid,
      name: section.name
    }));
  }

  async fetchTasks(sectionGid: string): Promise<AsanaTask[]> {
    console.log(`Fetching tasks for section ${sectionGid}...`);
    const response = await this.makeRequest<any>(
      `/sections/${sectionGid}/tasks?opt_fields=gid,name,assignee,completed,completed_at,created_at,due_on,priority,projects.name`
    );

    const tasks: AsanaTask[] = [];
    
    for (const taskData of response.data) {
      const subtasks = await this.fetchSubtasks(taskData.gid);
      
      tasks.push({
        gid: taskData.gid,
        name: taskData.name,
        assignee: taskData.assignee ? {
          gid: taskData.assignee.gid,
          name: taskData.assignee.name,
          email: taskData.assignee.email || undefined
        } : undefined,
        completed: taskData.completed,
        completed_at: taskData.completed_at,
        created_at: taskData.created_at,
        due_on: taskData.due_on,
        priority: taskData.priority,
        project: taskData.projects?.[0]?.name,
        subtasks
      });
    }

    return tasks;
  }

  async fetchSubtasks(taskGid: string): Promise<AsanaSubtask[]> {
    console.log(`Fetching subtasks for task ${taskGid}...`);
    const response = await this.makeRequest<any>(
      `/tasks/${taskGid}/subtasks?opt_fields=gid,name,assignee,followers,completed,created_at,completed_at,due_on,projects.name,priority`
    );

    return response.data.map((subtask: any) => ({
      gid: subtask.gid,
      name: subtask.name,
      assignee: subtask.assignee ? {
        gid: subtask.assignee.gid,
        name: subtask.assignee.name,
        email: subtask.assignee.email || undefined
      } : undefined,
      followers: subtask.followers?.map((follower: any) => ({
        gid: follower.gid,
        name: follower.name
      })) || [],
      completed: subtask.completed,
      created_at: subtask.created_at,
      completed_at: subtask.completed_at,
      due_on: subtask.due_on,
      project: subtask.projects?.[0]?.name,
      priority: subtask.priority
    }));
  }

  async fetchCompleteReport(): Promise<AsanaReport> {
    console.log('Starting complete report fetch...');
    
    // Fetch team users first
    const teamUsers = await this.fetchTeamUsers();
    console.log(`Fetched ${teamUsers.length} team users`);

    // Fetch sections
    const sectionsList = await this.fetchSections();
    console.log(`Fetched ${sectionsList.length} sections`);

    const sections: AsanaSection[] = [];
    
    for (const sectionInfo of sectionsList) {
      console.log(`Processing section: ${sectionInfo.name}`);
      const tasks = await this.fetchTasks(sectionInfo.gid);
      
      sections.push({
        gid: sectionInfo.gid,
        name: sectionInfo.name,
        tasks
      });
    }

    console.log('Complete report fetch finished');
    
    return {
      sections,
      teamUsers,
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Save report to Supabase database
 */
async function saveReportToSupabase(supabase: any, report: AsanaReport): Promise<void> {
  console.log('Saving report to Supabase...');
  
  // Delete existing reports (keep only the latest)
  const { error: deleteError } = await supabase
    .from('asana_reports')
    .delete()
    .neq('id', 0);

  if (deleteError) {
    console.error('Error deleting old reports:', deleteError);
    throw new Error(`Failed to delete old reports: ${deleteError.message}`);
  }

  // Insert new report
  const { error: insertError } = await supabase
    .from('asana_reports')
    .insert({
      data: report,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });

  if (insertError) {
    console.error('Error inserting new report:', insertError);
    throw new Error(`Failed to save new report: ${insertError.message}`);
  }

  console.log('Report saved successfully to Supabase');
}

export async function POST(request: NextRequest) {
  try {
    console.log('Asana sync API started');
    
    // Get environment variables
    const asanaToken = process.env.ASANA_TOKEN;
    const asanaProjectId = process.env.ASANA_PROJECT_ID;
    const asanaTeamId = process.env.ASANA_TEAM_ID;
    const rateLimit = parseInt(process.env.RATE_LIMIT || '150');
    
    if (!asanaToken || !asanaProjectId || !asanaTeamId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required environment variables: ASANA_TOKEN, ASANA_PROJECT_ID, ASANA_TEAM_ID'
        },
        { status: 500 }
      );
    }

    // Initialize Supabase client with service role key for server-side operations
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: 'Missing Supabase configuration' },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Initialize Asana API client
    const asanaClient = new AsanaApiClient({
      token: asanaToken,
      projectId: asanaProjectId,
      teamId: asanaTeamId,
      rateLimit
    });

    // Fetch complete report from Asana
    console.log('Fetching data from Asana API...');
    const report = await asanaClient.fetchCompleteReport();
    
    // Save to Supabase
    await saveReportToSupabase(supabase, report);
    
    console.log('Asana sync completed successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Asana data synchronized successfully',
      timestamp: new Date().toISOString(),
      stats: {
        sections: report.sections.length,
        totalTasks: report.sections.reduce((sum, s) => sum + s.tasks.length, 0),
        totalSubtasks: report.sections.reduce((sum, s) => 
          sum + s.tasks.reduce((taskSum, t) => taskSum + t.subtasks.length, 0), 0
        ),
        teamUsers: report.teamUsers?.length || 0
      }
    });

  } catch (error) {
    console.error('Asana sync error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}