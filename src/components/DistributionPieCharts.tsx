/**
 * Task Distribution Pie Charts component
 * Shows task distribution by project/section and by status
 */

'use client';

import React from 'react';
import ReactECharts from 'echarts-for-react';
import { ProjectDistribution, StatusDistribution } from '../lib/dataProcessor';

interface DistributionPieChartsProps {
  projectDistribution: ProjectDistribution[];
  statusDistribution: StatusDistribution[];
  isLoading?: boolean;
}

export default function DistributionPieCharts({ 
  projectDistribution, 
  statusDistribution, 
  isLoading = false 
}: DistributionPieChartsProps) {
  if (isLoading) {
    return <DistributionPieChartsSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Project Distribution Chart */}
      <ProjectDistributionChart data={projectDistribution} />
      
      {/* Status Distribution Chart */}
      <StatusDistributionChart data={statusDistribution} />
    </div>
  );
}

function ProjectDistributionChart({ data }: { data: ProjectDistribution[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tasks by Project</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="mt-2">No project data available</p>
          </div>
        </div>
      </div>
    );
  }

  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#F97316', '#06B6D4', '#84CC16', '#EC4899', '#6B7280'
  ];

  const option = {
    title: {
      text: 'Tasks by Project',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937'
      },
      left: 'center',
      top: 20
    },
    tooltip: {
      trigger: 'item',
      formatter: function(params: any) {
        return `
          <div class="font-medium">${params.name}</div>
          <div class="text-sm text-gray-600 mt-1">
            <strong>${params.value}</strong> tasks (${params.percent}%)
          </div>
        `;
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      textStyle: {
        color: '#374151'
      }
    },
    legend: {
      orient: 'vertical',
      left: 'right',
      top: 'middle',
      textStyle: {
        color: '#6B7280',
        fontSize: 12
      },
      formatter: function(name: string) {
        const item = data.find(d => d.project === name);
        return item ? `${name} (${item.count})` : name;
      }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '55%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            color: '#1F2937'
          }
        },
        labelLine: {
          show: false
        },
        data: data.map((item, index) => ({
          value: item.count,
          name: item.project,
          itemStyle: {
            color: colors[index % colors.length]
          }
        }))
      }
    ]
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="h-80">
        <ReactECharts 
          option={option} 
          style={{ width: '100%', height: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {data.reduce((sum, item) => sum + item.count, 0)}
          </div>
          <div className="text-sm text-gray-600">Total Tasks</div>
        </div>
      </div>
    </div>
  );
}

function StatusDistributionChart({ data }: { data: StatusDistribution[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Tasks by Status</h3>
        <div className="flex items-center justify-center h-64 text-gray-500">
          <div className="text-center">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <p className="mt-2">No status data available</p>
          </div>
        </div>
      </div>
    );
  }

  const statusColors = {
    'Completed': '#10B981',
    'In Progress': '#3B82F6',
    'Overdue': '#EF4444',
    'Not Started': '#6B7280'
  };

  const option = {
    title: {
      text: 'Tasks by Status',
      textStyle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937'
      },
      left: 'center',
      top: 20
    },
    tooltip: {
      trigger: 'item',
      formatter: function(params: any) {
        return `
          <div class="font-medium">${params.name}</div>
          <div class="text-sm text-gray-600 mt-1">
            <strong>${params.value}</strong> tasks (${params.percent}%)
          </div>
        `;
      },
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      textStyle: {
        color: '#374151'
      }
    },
    legend: {
      orient: 'vertical',
      left: 'right',
      top: 'middle',
      textStyle: {
        color: '#6B7280',
        fontSize: 12
      },
      formatter: function(name: string) {
        const item = data.find(d => d.status === name);
        return item ? `${name} (${item.count})` : name;
      }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        center: ['35%', '55%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 8,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: false,
          position: 'center'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 16,
            fontWeight: 'bold',
            color: '#1F2937'
          }
        },
        labelLine: {
          show: false
        },
        data: data.map(item => ({
          value: item.count,
          name: item.status,
          itemStyle: {
            color: statusColors[item.status] || '#6B7280'
          }
        }))
      }
    ]
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="h-80">
        <ReactECharts 
          option={option} 
          style={{ width: '100%', height: '100%' }}
          opts={{ renderer: 'canvas' }}
        />
      </div>
      
      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center text-sm">
          {data.map(item => (
            <div key={item.status}>
              <div 
                className="text-lg font-bold"
                style={{ color: statusColors[item.status] || '#6B7280' }}
              >
                {item.count}
              </div>
              <div className="text-gray-600">{item.status}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DistributionPieChartsSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {Array.from({ length: 2 }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="h-6 w-32 bg-gray-300 rounded animate-pulse mb-4"></div>
          <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="h-8 w-16 bg-gray-300 rounded animate-pulse mx-auto"></div>
            <div className="h-4 w-20 bg-gray-300 rounded animate-pulse mt-2 mx-auto"></div>
          </div>
        </div>
      ))}
    </div>
  );
}