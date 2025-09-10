/**
 * Individual Dashboard Page with Role-Based Access Control
 * Main dashboard displaying Asana task analytics with permissions based on user role
 */

'use client';

import React from 'react';
import Header from '../../src/components/Header';
import KpiCards from '../../src/components/KpiCards';
import WeeklySummaryChart from '../../src/components/WeeklySummaryChart';
import DistributionPieCharts from '../../src/components/DistributionPieCharts';
import CurrentTasksTable from '../../src/components/CurrentTasksTable';
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
import { UserRoleLevel } from '../../src/types/userRoles';

export default function DashboardPage() {
  const { userRole, permissions } = useAuth();
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
    selectAssignee
  } = useAsanaData();

  // Loading state for role information
  if (!userRole && !error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลดข้อมูลผู้ใช้...</p>
        </div>
      </div>
    );
  }

  // Role-based title
  const getDashboardTitle = () => {
    if (!userRole) return 'Dashboard';
    
    switch (userRole.role_level) {
      case UserRoleLevel.OPERATIONAL:
        return 'Dashboard ส่วนบุคคล';
      case UserRoleLevel.MANAGER:
        return 'Dashboard ระดับหัวหน้างาน';
      case UserRoleLevel.DEPUTY_DIRECTOR:
        return 'Dashboard ระดับรองผู้อำนวยการ';
      case UserRoleLevel.DIRECTOR:
        return 'Dashboard ระดับผู้อำนวยการ';
      case UserRoleLevel.ADMIN:
        return 'Dashboard ผู้ดูแลระบบ';
      default:
        return 'Dashboard';
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
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Assignee Selector (only for users who can select others) */}
        {permissions?.canSelectUsers && assignees.length > 1 && (
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-medium text-gray-900">เลือกสมาชิกทีม</h2>
                  <p className="text-xs text-gray-600 mt-1">
                    ดูข้อมูลรายบุคคลของสมาชิกทีมที่คุณมีสิทธิ์เข้าถึง
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
                      {assignees.map(assignee => (
                        <SelectItem key={assignee.gid} value={assignee.gid}>
                          {assignee.name} {assignee.email && `(${assignee.email})`}
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
                subtasks={assigneeStats.assignee && report ? (() => {
                  const userData = report.getUserData(assigneeStats.assignee.gid);
                  return [...userData.assigneeData.subtasks, ...userData.collaboratorData.subtasks];
                })() : []}
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
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-blue-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${loadingProgress.percentage}%` }}
                  ></div>
                </div>
                
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