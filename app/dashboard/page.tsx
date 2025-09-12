/**
 * Individual Dashboard Page with Role-Based Access Control
 * Main dashboard displaying Asana task analytics with permissions based on user role
 */

'use client';

import React, { useState, useMemo } from 'react';
import Header from '../../src/components/Header';
import KpiCards from '../../src/components/KpiCards';
import WeeklySummaryChart from '../../src/components/WeeklySummaryChart';
import DistributionPieCharts from '../../src/components/DistributionPieCharts';
import CurrentTasksTable from '../../src/components/CurrentTasksTable';
import DepartmentSelector, { DepartmentBadge } from '../../src/components/DepartmentSelector';
import CalendarView from '../../src/components/CalendarView';
import FiltersPanel from '../../src/components/FiltersPanel';
import type { FilterOptions } from '../../src/components/FiltersPanel';
import ExportButtons from '../../src/components/ExportButtons';
import WorkloadChart from '../../src/components/WorkloadChart';
import PerformanceRadar from '../../src/components/PerformanceRadar';
import { useAsanaData } from '../../src/lib/hooks/useAsanaDataApi';
import { useAuth } from '../../src/contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../components/ui/select';
import { UserRoleLevel, getDepartmentDisplayName } from '../../src/types/userRoles';

export default function DashboardPage() {
  const { userRole, userDepartments, currentDepartment, permissions, setCurrentDepartment } = useAuth();
  const {
    report,
    assignees,
    selectedAssignee,
    assigneeStats,
    teamAverages,
    isLoading,
    isRefreshing,
    error,
    loadingProgress,
    refreshData,
    selectAssignee,
    cacheInfo
  } = useAsanaData();

  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    status: 'all',
    priority: 'all',
    project: 'all',
    dateRange: { startDate: '', endDate: '' },
    assigneeType: 'all'
  });

  // Filtered subtasks based on filters
  const filteredSubtasks = useMemo(() => {
    if (!assigneeStats?.assignee || !report) return [];
    const userData = report.getUserData(assigneeStats.assignee.gid);
    let subtasks = [...userData.assigneeData.subtasks, ...userData.collaboratorData.subtasks];

    // Apply filters
    if (filters.searchQuery) {
      subtasks = subtasks.filter(task => 
        task.name?.toLowerCase().includes(filters.searchQuery.toLowerCase())
      );
    }

    if (filters.status !== 'all') {
      if (filters.status === 'completed') {
        subtasks = subtasks.filter(task => task.completed);
      } else if (filters.status === 'pending') {
        subtasks = subtasks.filter(task => !task.completed);
      } else if (filters.status === 'overdue') {
        subtasks = subtasks.filter(task => task.isOverdue());
      }
    }

    if (filters.priority !== 'all') {
      if (filters.priority === 'none') {
        subtasks = subtasks.filter(task => !task.priority);
      } else {
        subtasks = subtasks.filter(task => 
          task.priority?.toLowerCase() === filters.priority
        );
      }
    }

    if (filters.project !== 'all') {
      subtasks = subtasks.filter(task => task.project === filters.project);
    }

    if (filters.assigneeType !== 'all') {
      if (filters.assigneeType === 'mine') {
        subtasks = subtasks.filter(task => task.assignee?.gid === assigneeStats.assignee?.gid);
      } else if (filters.assigneeType === 'others') {
        subtasks = subtasks.filter(task => task.assignee?.gid !== assigneeStats.assignee?.gid);
      }
    }

    // Date range filter
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      subtasks = subtasks.filter(task => {
        const taskDate = task.created_at || task.completed_at;
        if (!taskDate) return false;
        
        const date = new Date(taskDate);
        const startDate = filters.dateRange.startDate ? new Date(filters.dateRange.startDate) : null;
        const endDate = filters.dateRange.endDate ? new Date(filters.dateRange.endDate) : null;
        
        if (startDate && date < startDate) return false;
        if (endDate && date > endDate) return false;
        
        return true;
      });
    }

    return subtasks;
  }, [assigneeStats, report, filters]);

  // Available projects for filtering
  const availableProjects = useMemo(() => {
    if (!assigneeStats?.assignee || !report) return [];
    
    const userData = report.getUserData(assigneeStats.assignee.gid);
    const allSubtasks = [...userData.assigneeData.subtasks, ...userData.collaboratorData.subtasks];
    const projects = Array.from(new Set(allSubtasks.map(task => task.project).filter((project): project is string => Boolean(project))));
    return projects.sort();
  }, [assigneeStats, report]);

  // Loading state for role information
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูลผู้ใช้...</p>
          <p className="mt-2 text-sm text-gray-500">กรุณารอสักครู่</p>
          
          {/* Add a timeout message */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              หากการโหลดใช้เวลานาน อาจเป็นเพราะ:
            </p>
            <ul className="text-sm text-blue-600 mt-2 text-left space-y-1">
              <li>• การเชื่อมต่อฐานข้อมูลช้า</li>
              <li>• ปัญหาการกำหนดค่าระบบ</li>
              <li>• ปัญหาเครือข่าย</li>
            </ul>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="mt-3 text-blue-600 border-blue-200 hover:bg-blue-100"
            >
              รีโหลดหน้า
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Check if Supabase is configured
  const supabaseConfigured = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  
  if (!supabaseConfigured) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border border-yellow-200 p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
              <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.99-.833-2.76 0L3.054 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">ระบบยังไม่ได้กำหนดค่า</h3>
            <p className="text-gray-600 mb-4">
              กรุณากำหนดค่าการเชื่อมต่อฐานข้อมูล Supabase เพื่อใช้งานระบบ
            </p>
            <div className="bg-gray-50 rounded-md p-4 text-left">
              <p className="text-sm font-medium text-gray-900 mb-2">วิธีการกำหนดค่า:</p>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>สร้างไฟล์ <code className="bg-gray-200 px-1 rounded">.env.local</code> ในโฟลเดอร์โปรเจกต์</li>
                <li>เพิ่มข้อมูลการเชื่อมต่อ Supabase:</li>
                <li className="ml-4">
                  <code className="bg-gray-200 px-2 py-1 rounded text-xs block mt-1">
                    NEXT_PUBLIC_SUPABASE_URL=your_supabase_url<br/>
                    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_key
                  </code>
                </li>
                <li>รีสตาร์ทเซิร์ฟเวอร์</li>
              </ol>
            </div>
            <div className="mt-6">
              <Button onClick={() => window.location.reload()}>
                ตรวจสอบอีกครั้ง
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Role-based title with department context
  const getDashboardTitle = () => {
    if (!userRole) return 'Dashboard';
    
    const departmentContext = currentDepartment ? ` - ${getDepartmentDisplayName(currentDepartment)}` : '';
    
    switch (userRole.role_level) {
      case UserRoleLevel.OPERATIONAL:
        return `Dashboard ส่วนบุคคล${departmentContext}`;
      case UserRoleLevel.MANAGER:
        return `Dashboard ระดับหัวหน้างาน${departmentContext}`;
      case UserRoleLevel.DEPUTY_DIRECTOR:
        return `Dashboard ระดับรองผู้อำนวยการ${departmentContext}`;
      case UserRoleLevel.DIRECTOR:
        return `Dashboard ระดับผู้อำนวยการ${departmentContext}`;
      case UserRoleLevel.ADMIN:
        return `Dashboard ผู้ดูแลระบบ${departmentContext}`;
      default:
        return `Dashboard${departmentContext}`;
    }
  };

  // Error state
  if (error && !isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-lg shadow-sm border border-red-200 p-8 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Configuration Required</h3>
            <p className="text-gray-600 mb-4">
              Please set up your Asana API credentials to use the dashboard.
            </p>
            <div className="bg-gray-50 rounded-md p-4 text-left">
              <p className="text-sm font-medium text-gray-900 mb-2">Setup Instructions:</p>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Create a <code className="bg-gray-200 px-1 rounded">.env.local</code> file in your project root</li>
                <li>Add your Asana Personal Access Token:</li>
                <li className="ml-4">
                  <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                    ASANA_TOKEN=your_token_here
                  </code>
                </li>
                <li>Add your Project ID:</li>
                <li className="ml-4">
                  <code className="bg-gray-200 px-2 py-1 rounded text-xs">
                    ASANA_PROJECT_ID=your_project_id
                  </code>
                </li>
                <li>Restart the development server</li>
              </ol>
            </div>
            <div className="mt-6">
              <Button
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
            <div className="mt-4 text-sm text-gray-500">
              Error: {error}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header
        assignee={selectedAssignee || undefined}
        onRefresh={refreshData}
        isLoading={isRefreshing || !!loadingProgress}
        report={report}
        assigneeStats={assigneeStats}
        subtasks={filteredSubtasks}
        cacheInfo={cacheInfo}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Department Selector (only for users with multiple departments) */}
        {userDepartments.length > 1 && (
          <div className="mb-6">
            <DepartmentSelector
              departments={userDepartments}
              currentDepartment={currentDepartment}
              onDepartmentChange={setCurrentDepartment}
            />
          </div>
        )}

        {/* Assignee Selector (only for users who can select others) */}
        {permissions?.canSelectUsers && assignees.length > 1 && (
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-3">
                    <h2 className="text-sm font-medium text-gray-900">เลือกสมาชิกทีม</h2>
                    {currentDepartment && (
                      <DepartmentBadge department={currentDepartment} />
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    ดูข้อมูลรายบุคคลของสมาชิกทีมที่คุณมีสิทธิ์เข้าถึงในฝ่ายงานนี้
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Select
                    value={selectedAssignee?.gid || ''}
                    onValueChange={(value) => selectAssignee(value)}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="เลือกสมาชิก..." />
                    </SelectTrigger>
                    <SelectContent>
                      {assignees
                        .slice()
                        .sort((a, b) => (a.email || '').localeCompare(b.email || ''))
                        .map(assignee => (
                          <SelectItem key={assignee.gid} value={assignee.gid}>
                            <div className="flex flex-col">
                              <span>{assignee.name}</span>
                              {assignee.email && (
                                <span className="text-xs text-gray-500">{assignee.email}</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <div className="text-xs text-gray-500">
                    {assignees.length} คน
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard Content */}
        {selectedAssignee && assigneeStats ? (
          <div className="space-y-6">
            {/* Filters Panel */}
            <section>
              <FiltersPanel
                onFiltersChange={setFilters}
                projects={availableProjects}
                isLoading={isLoading}
                defaultFilters={{
                  assigneeType: permissions?.canSelectUsers ? 'all' : 'mine'
                }}
              />
            </section>

            {/* KPI Cards */}
            <section>
              <KpiCards stats={assigneeStats} isLoading={isLoading} />
            </section>

            {/* Charts Row */}
            <section>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Summary Chart */}
                <div className="lg:col-span-2">
                  <WeeklySummaryChart
                    weeklyData={assigneeStats.weeklyData}
                    monthlyData={assigneeStats.monthlyData}
                    teamAverage={teamAverages?.averageTasksPerWeek}
                    isLoading={isLoading}
                  />
                </div>
              </div>
            </section>

            {/* Distribution Charts */}
            <section>
              <DistributionPieCharts
                projectDistribution={assigneeStats.projectDistribution}
                statusDistribution={assigneeStats.statusDistribution}
                isLoading={isLoading}
              />
            </section>

            {/* Tasks Table */}
            <section>
              <CurrentTasksTable
                subtasks={filteredSubtasks}
                isLoading={isLoading}
                userGid={assigneeStats.assignee?.gid}
              />
            </section>
          </div>
        ) : !isLoading ? (
          /* No assignee selected state */
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
              <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              ยินดีต้อนรับสู่ {getDashboardTitle()}
            </h3>
            <p className="text-gray-600 mb-4">
              {assignees.length === 0 
                ? 'ไม่พบข้อมูลสมาชิกในโครงการ' 
                : permissions?.canSelectUsers 
                  ? 'เลือกสมาชิกทีมข้างต้นเพื่อดูข้อมูลรายบุคคล'
                  : 'กำลังโหลดข้อมูลของคุณ...'
              }
            </p>
            {assignees.length === 0 && (
              <Button
                onClick={refreshData}
              >
                รีเฟรชข้อมูล
              </Button>
            )}
          </div>
        ) : null}

        {/* Loading State */}
        {(isLoading || loadingProgress) && (
          <div className="space-y-6">
            {/* Loading Progress */}
            {loadingProgress && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">กำลังโหลดข้อมูล</h3>
                    <p className="text-sm text-gray-600 mt-1">{loadingProgress.status}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-blue-600">{loadingProgress.percentage}%</div>
                    <div className="text-xs text-gray-500">
                      {loadingProgress.current} / {loadingProgress.total}
                    </div>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress.percentage}%` }}
                  ></div>
                </div>

                {/* Detailed Progress - Show actual counts */}
                {(loadingProgress.teamUsers || loadingProgress.sections || loadingProgress.tasks || loadingProgress.subtasks) && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                    {loadingProgress.teamUsers && (
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">
                          {loadingProgress.teamUsers.loaded}
                        </div>
                        <div className="text-xs text-gray-600">ผู้ใช้งาน</div>
                        {loadingProgress.teamUsers.total > 0 && (
                          <div className="text-xs text-gray-500">
                            /{loadingProgress.teamUsers.total}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {loadingProgress.sections && (
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          {loadingProgress.sections.loaded}
                        </div>
                        <div className="text-xs text-gray-600">แผนก</div>
                        {loadingProgress.sections.total > 0 && (
                          <div className="text-xs text-gray-500">
                            /{loadingProgress.sections.total}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {loadingProgress.tasks && (
                      <div className="text-center p-3 bg-yellow-50 rounded-lg">
                        <div className="text-lg font-bold text-yellow-600">
                          {loadingProgress.tasks.loaded}
                        </div>
                        <div className="text-xs text-gray-600">งาน</div>
                        {loadingProgress.tasks.total > 0 && (
                          <div className="text-xs text-gray-500">
                            /{loadingProgress.tasks.total}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {loadingProgress.subtasks && (
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-lg font-bold text-purple-600">
                          {loadingProgress.subtasks.loaded}
                        </div>
                        <div className="text-xs text-gray-600">งานย่อย</div>
                        {loadingProgress.subtasks.total > 0 && (
                          <div className="text-xs text-gray-500">
                            /{loadingProgress.subtasks.total}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Loading Animation */}
                <div className="flex items-center justify-center mt-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">กรุณารอสักครู่...</span>
                </div>
              </div>
            )}
            
            {/* Skeleton Loaders */}
            {!loadingProgress && (
              <>
                {/* KPI Cards Skeleton */}
                <KpiCards isLoading={true} />
                
                {/* Charts Skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="lg:col-span-2">
                    <WeeklySummaryChart weeklyData={[]} monthlyData={[]} isLoading={true} />
                  </div>
                </div>
                
                <DistributionPieCharts 
                  projectDistribution={[]} 
                  statusDistribution={[]} 
                  isLoading={true} 
                />
                
                <CurrentTasksTable 
                  subtasks={[]} 
                  isLoading={true} 
                />
              </>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <div>
              Asana Dashboard ระบบหลายระดับผู้ใช้ - Built with Next.js & ECharts
            </div>
            <div>
              {report && (
                <span>
                  อัปเดตล่าสุด: {new Date(report.lastUpdated).toLocaleString('th-TH')}
                </span>
              )}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}