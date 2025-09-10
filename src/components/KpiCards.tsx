/**
 * KPI Cards component for Individual Dashboard
 * Displays key performance indicators in card format
 */

'use client';

import React from 'react';
import { AssigneeStats } from '../lib/dataProcessor';
import { Card, CardContent } from '../../components/ui/card';

interface KpiCardsProps {
  stats?: AssigneeStats;
  isLoading?: boolean;
}

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
}

function KpiCard({ title, value, subtitle, trend, trendValue, icon, color }: KpiCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  const trendClasses = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className={`flex-shrink-0 p-3 rounded-md ${colorClasses[color]}`}>
            {icon}
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{title}</p>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                {subtitle && (
                  <p className="text-sm text-gray-500">{subtitle}</p>
                )}
              </div>
              {trend && trendValue && (
                <div className={`flex items-center ${trendClasses[trend]}`}>
                  {trend === 'up' && (
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {trend === 'down' && (
                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  <span className="text-sm font-medium">{trendValue}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function KpiCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-3 rounded-md bg-gray-200 animate-pulse">
            <div className="w-6 h-6 bg-gray-300 rounded"></div>
          </div>
          <div className="ml-4 flex-1">
            <div className="space-y-2">
              <div className="h-4 w-24 bg-gray-300 rounded animate-pulse"></div>
              <div className="h-8 w-16 bg-gray-300 rounded animate-pulse"></div>
              <div className="h-3 w-32 bg-gray-300 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function KpiCards({ stats, isLoading = false }: KpiCardsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {Array.from({ length: 5 }).map((_, index) => (
          <KpiCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Calculate trends (mock data for now - could be enhanced with historical comparison)
  const completionTrend = stats.completionRate >= 80 ? 'up' : stats.completionRate >= 60 ? 'neutral' : 'down';
  const overdueColor = stats.overdueTasks === 0 ? 'green' : stats.overdueTasks <= 2 ? 'yellow' : 'red';

  // Calculate recent weekly performance
  const recentWeeks = stats.weeklyData.slice(-2);
  const currentWeekCompleted = recentWeeks[1]?.completed || 0;
  const previousWeekCompleted = recentWeeks[0]?.completed || 0;
  const weeklyTrend = currentWeekCompleted > previousWeekCompleted ? 'up' : 
                     currentWeekCompleted < previousWeekCompleted ? 'down' : 'neutral';

  const kpiData: Omit<KpiCardProps, 'icon'>[] = [
    {
      title: 'Total Tasks',
      value: stats.totalTasks,
      subtitle: 'Assigned to you',
      color: 'blue',
    },
    {
      title: 'Completed',
      value: stats.completedTasks,
      subtitle: `${stats.totalTasks - stats.completedTasks} remaining`,
      trend: weeklyTrend,
      trendValue: `${Math.abs(currentWeekCompleted - previousWeekCompleted)} this week`,
      color: 'green',
    },
    {
      title: 'Completion Rate',
      value: `${Math.round(stats.completionRate)}%`,
      subtitle: 'Overall performance',
      trend: completionTrend,
      trendValue: stats.completionRate >= 80 ? 'Excellent' : stats.completionRate >= 60 ? 'Good' : 'Needs improvement',
      color: stats.completionRate >= 80 ? 'green' : stats.completionRate >= 60 ? 'yellow' : 'red',
    },
    {
      title: 'Overdue Tasks',
      value: stats.overdueTasks,
      subtitle: stats.overdueTasks === 0 ? 'Great job!' : 'Need attention',
      color: overdueColor,
    },
    {
      title: 'Avg. Time per Task',
      value: stats.averageTimePerTask > 0 ? `${Math.round(stats.averageTimePerTask)}d` : 'N/A',
      subtitle: 'Time to completion',
      color: 'purple',
    },
  ];

  const icons = [
    // Total Tasks - Clipboard icon
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" key="total">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>,
    // Completed - Check circle icon
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" key="completed">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>,
    // Completion Rate - Chart bar icon
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" key="rate">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>,
    // Overdue - Exclamation circle icon
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" key="overdue">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>,
    // Average Time - Clock icon
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" key="time">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>,
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
      {kpiData.map((kpi, index) => (
        <KpiCard
          key={kpi.title}
          {...kpi}
          icon={icons[index]}
        />
      ))}
    </div>
  );
}