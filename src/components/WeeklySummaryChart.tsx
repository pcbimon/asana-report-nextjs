/**
 * Weekly Task Summary Chart component
 * Line chart showing assigned vs completed tasks per week with team average
 */

'use client';

import React, { useState } from 'react';
import ReactECharts from 'echarts-for-react';
import { WeeklyTaskData, MonthlyTaskData } from '../lib/dataProcessor';
import dayjs from 'dayjs';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../components/ui/select';

type ViewMode = 'week' | 'month';

interface WeeklySummaryChartProps {
  weeklyData: WeeklyTaskData[];
  monthlyData: MonthlyTaskData[];
  teamAverage?: number;
  isLoading?: boolean;
}

export default function WeeklySummaryChart({ 
  weeklyData, 
  monthlyData,
  teamAverage = 0, 
  isLoading = false 
}: WeeklySummaryChartProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('week');

  if (isLoading) {
    return <WeeklySummaryChartSkeleton />;
  }

  // Select the appropriate data based on view mode
  const currentData = viewMode === 'week' ? weeklyData : monthlyData;
  const hasData = currentData && currentData.length > 0;

  if (!hasData) {
    return (
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>
              {viewMode === 'week' ? 'Weekly' : 'Monthly'} Task Summary
            </CardTitle>
            <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64 text-gray-500">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p className="mt-2">No {viewMode}ly data available</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Prepare data for ECharts
  const categories = currentData.map(item => {
    if (viewMode === 'week') {
      const weekData = item as WeeklyTaskData;
      const weekStart = dayjs(weekData.weekStart);
      return weekStart.format('MMM DD');
    } else {
      const monthData = item as MonthlyTaskData;
      const monthStart = dayjs(monthData.monthStart);
      return monthStart.format('MMM YYYY');
    }
  });

  const assignedData = currentData.map(item => item.assigned);
  const completedData = currentData.map(item => item.completed);
  const teamAverageData = teamAverage > 0 ? currentData.map(() => teamAverage) : [];
  const expectNumberOfTasksData = teamAverageData.map(item => 3); // Example expectation

  const option = {
    title: {
      show: false, // Hide title since we're using CardTitle
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      },
      formatter: function(params: any) {
        let result = `<div class="font-medium">${params[0].axisValue}</div>`;
        params.forEach((param: any) => {
          const color = param.color;
          const name = param.seriesName;
          const value = param.value;
          result += `
            <div class="flex items-center mt-1">
              <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${color}"></div>
              <span class="text-gray-700">${name}: <strong>${value}</strong></span>
            </div>
          `;
        });
        return result;
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      textStyle: {
        color: '#374151'
      }
    },
    legend: {
      data: teamAverage > 0 ? ['Assigned', 'Completed', 'Expected Tasks'] : ['Assigned', 'Completed'],
      top: 30,
      textStyle: {
        color: '#6B7280'
      }
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      top: '20%',
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: categories,
      axisLine: {
        lineStyle: {
          color: '#E5E7EB'
        }
      },
      axisLabel: {
        color: '#6B7280',
        fontSize: 12
      }
    },
    yAxis: {
      type: 'value',
      axisLine: {
        lineStyle: {
          color: '#E5E7EB'
        }
      },
      axisLabel: {
        color: '#6B7280',
        fontSize: 12
      },
      splitLine: {
        lineStyle: {
          color: '#F3F4F6'
        }
      }
    },
    series: [
      {
        name: 'Assigned',
        type: 'line',
        data: assignedData,
        smooth: true,
        lineStyle: {
          color: '#3B82F6',
          width: 3
        },
        itemStyle: {
          color: '#3B82F6'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(59, 130, 246, 0.2)' },
              { offset: 1, color: 'rgba(59, 130, 246, 0.05)' }
            ]
          }
        }
      },
      {
        name: 'Completed',
        type: 'line',
        data: completedData,
        smooth: true,
        lineStyle: {
          color: '#10B981',
          width: 3
        },
        itemStyle: {
          color: '#10B981'
        },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(16, 185, 129, 0.2)' },
              { offset: 1, color: 'rgba(16, 185, 129, 0.05)' }
            ]
          }
        }
      },
      ...(teamAverage > 0 ? [{
        name: 'Expected Tasks',
        type: 'line',
        data: expectNumberOfTasksData,
        lineStyle: {
          color: '#F59E0B',
          width: 2,
          type: 'dashed'
        },
        itemStyle: {
          color: '#F59E0B'
        },
        symbol: 'none'
      }] : [])
    ]
  };

  // Calculate some stats for display
  const totalAssigned = assignedData.reduce((sum, val) => sum + val, 0);
  const totalCompleted = completedData.reduce((sum, val) => sum + val, 0);
  const completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>
              {viewMode === 'week' ? 'Weekly' : 'Monthly'} Task Summary
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Track your task assignment and completion trends over time
              {viewMode === 'week' ? ' (52 weeks)' : ' (12 months)'}
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="text-sm text-gray-500">
                Overall Completion Rate
              </div>
              <div className={`text-lg font-bold ${
                completionRate >= 80 ? 'text-green-600' : 
                completionRate >= 60 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {Math.round(completionRate)}%
              </div>
            </div>
            <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="month">Month</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80" id="weekly-summary-chart">
          <ReactECharts 
            option={option} 
            style={{ width: '100%', height: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </div>

        {/* Summary stats */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{totalAssigned}</div>
              <div className="text-sm text-gray-600">Total Assigned</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{totalCompleted}</div>
              <div className="text-sm text-gray-600">Total Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-gray-600">{totalAssigned - totalCompleted}</div>
              <div className="text-sm text-gray-600">Remaining</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function WeeklySummaryChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <div className="h-6 w-48 bg-gray-300 rounded animate-pulse"></div>
            <div className="h-4 w-64 bg-gray-300 rounded animate-pulse mt-2"></div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <div className="h-4 w-24 bg-gray-300 rounded animate-pulse"></div>
              <div className="h-6 w-12 bg-gray-300 rounded animate-pulse mt-1"></div>
            </div>
            <div className="h-10 w-32 bg-gray-300 rounded animate-pulse"></div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 bg-gray-100 rounded animate-pulse"></div>

        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index}>
                <div className="h-8 w-12 bg-gray-300 rounded animate-pulse mx-auto"></div>
                <div className="h-4 w-20 bg-gray-300 rounded animate-pulse mt-2 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}