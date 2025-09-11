/**
 * Workload Chart Component
 * Shows weekly/monthly workload with simple linear projection forecast
 */

'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { 
  BarChart, 
  Calendar, 
  TrendingUp, 
  BarChart3 
} from 'lucide-react';
import * as echarts from 'echarts';
import { ECharts } from 'echarts';
import { WeeklyTaskData, MonthlyTaskData } from '../lib/dataProcessor';

interface WorkloadChartProps {
  weeklyData: WeeklyTaskData[];
  monthlyData: MonthlyTaskData[];
  isLoading?: boolean;
}

type ViewMode = 'weekly' | 'monthly';

const WorkloadChart: React.FC<WorkloadChartProps> = ({
  weeklyData,
  monthlyData,
  isLoading = false
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [chartInstance, setChartInstance] = useState<ECharts | null>(null);

  // Calculate linear trend
  const calculateLinearTrend = (values: number[]) => {
    const n = values.length;
    const sumX = values.reduce((sum, _, i) => sum + i, 0);
    const sumY = values.reduce((sum, val) => sum + val, 0);
    const sumXY = values.reduce((sum, val, i) => sum + (i * val), 0);
    const sumXX = values.reduce((sum, _, i) => sum + (i * i), 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    return { slope, intercept };
  };

  // Format period for display
  const formatPeriod = (date: Date, mode: ViewMode): string => {
    if (mode === 'weekly') {
      return `${date.getDate()}/${date.getMonth() + 1}`;
    } else {
      const thaiMonths = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
                         'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
      return `${thaiMonths[date.getMonth()]} ${date.getFullYear() + 543}`;
    }
  };

  // Process data and generate forecast
  const processedData = useMemo(() => {
    if (viewMode === 'weekly') {
      const data = weeklyData;
      if (!data || data.length === 0) {
        return { historical: [], forecast: [], labels: [] };
      }

      // Sort data by date
      const sortedData = [...data].sort((a, b) => 
        new Date(a.weekStart).getTime() - new Date(b.weekStart).getTime()
      );

      // Historical data
      const historical = sortedData.map(item => ({
        period: item.week,
        assigned: item.assigned,
        completed: item.completed,
        workload: item.assigned + item.completed // Total workload
      }));

      // Generate forecast using simple linear regression
      const forecastPeriods = 4; // Forecast next 4 periods
      const forecast = [];
      
      if (historical.length >= 2) {
        // Calculate trend for assigned and completed tasks
        const assignedTrend = calculateLinearTrend(historical.map(h => h.assigned));
        const completedTrend = calculateLinearTrend(historical.map(h => h.completed));
        
        const lastDate = new Date(sortedData[sortedData.length - 1].weekStart);
        
        for (let i = 1; i <= forecastPeriods; i++) {
          const forecastDate = new Date(lastDate);
          forecastDate.setDate(lastDate.getDate() + (i * 7));
          
          const forecastIndex = historical.length + i - 1;
          const assignedForecast = Math.max(0, Math.round(assignedTrend.intercept + assignedTrend.slope * forecastIndex));
          const completedForecast = Math.max(0, Math.round(completedTrend.intercept + completedTrend.slope * forecastIndex));
          
          forecast.push({
            period: formatPeriod(forecastDate, 'weekly'),
            assigned: assignedForecast,
            completed: completedForecast,
            workload: assignedForecast + completedForecast,
            isForecast: true
          });
        }
      }

      // Labels for chart
      const labels = [
        ...historical.map(h => h.period),
        ...forecast.map(f => f.period)
      ];

      return { historical, forecast, labels };
    } else {
      // Monthly data
      const data = monthlyData;
      if (!data || data.length === 0) {
        return { historical: [], forecast: [], labels: [] };
      }

      // Sort data by date
      const sortedData = [...data].sort((a, b) => 
        new Date(a.monthStart).getTime() - new Date(b.monthStart).getTime()
      );

      // Historical data
      const historical = sortedData.map(item => ({
        period: item.month,
        assigned: item.assigned,
        completed: item.completed,
        workload: item.assigned + item.completed // Total workload
      }));

      // Generate forecast using simple linear regression
      const forecastPeriods = 4; // Forecast next 4 periods
      const forecast = [];
      
      if (historical.length >= 2) {
        // Calculate trend for assigned and completed tasks
        const assignedTrend = calculateLinearTrend(historical.map(h => h.assigned));
        const completedTrend = calculateLinearTrend(historical.map(h => h.completed));
        
        const lastDate = new Date(sortedData[sortedData.length - 1].monthStart);
        
        for (let i = 1; i <= forecastPeriods; i++) {
          const forecastDate = new Date(lastDate);
          forecastDate.setMonth(lastDate.getMonth() + i);
          
          const forecastIndex = historical.length + i - 1;
          const assignedForecast = Math.max(0, Math.round(assignedTrend.intercept + assignedTrend.slope * forecastIndex));
          const completedForecast = Math.max(0, Math.round(completedTrend.intercept + completedTrend.slope * forecastIndex));
          
          forecast.push({
            period: formatPeriod(forecastDate, 'monthly'),
            assigned: assignedForecast,
            completed: completedForecast,
            workload: assignedForecast + completedForecast,
            isForecast: true
          });
        }
      }

      // Labels for chart
      const labels = [
        ...historical.map(h => h.period),
        ...forecast.map(f => f.period)
      ];

      return { historical, forecast, labels };
    }
  }, [weeklyData, monthlyData, viewMode]);


  // Initialize chart
  React.useEffect(() => {
    const chartElement = document.getElementById('workload-chart');
    if (!chartElement || isLoading) return;

    const chart = echarts.init(chartElement);
    setChartInstance(chart);

    const option: echarts.EChartsOption = {
      title: {
        text: viewMode === 'weekly' ? 'แนวโน้มภาระงานรายสัปดาห์' : 'แนวโน้มภาระงานรายเดือน',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross'
        },
        formatter: (params: any) => {
          const data = params[0];
          const isForecast = data.dataIndex >= processedData.historical.length;
          const prefix = isForecast ? '(พยากรณ์) ' : '';
          
          return `
            ${prefix}${data.axisValue}<br/>
            งานที่ได้รับ: ${params[0]?.value || 0}<br/>
            งานที่เสร็จ: ${params[1]?.value || 0}<br/>
            ภาระงานรวม: ${params[2]?.value || 0}
          `;
        }
      },
      legend: {
        data: ['งานที่ได้รับ', 'งานที่เสร็จ', 'ภาระงานรวม'],
        top: 30
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: processedData.labels,
        axisLabel: {
          rotate: viewMode === 'weekly' ? 45 : 0
        }
      },
      yAxis: {
        type: 'value',
        name: 'จำนวนงาน',
        nameLocation: 'middle',
        nameGap: 40
      },
      series: [
        {
          name: 'งานที่ได้รับ',
          type: 'bar',
          stack: 'total',
          data: [
            ...processedData.historical.map(h => h.assigned),
            ...processedData.forecast.map(f => f.assigned)
          ],
          itemStyle: {
            color: '#3b82f6',
            opacity: 1
          }
        },
        {
          name: 'งานที่เสร็จ',
          type: 'bar',
          stack: 'total',
          data: [
            ...processedData.historical.map(h => h.completed),
            ...processedData.forecast.map(f => f.completed)
          ],
          itemStyle: {
            color: '#10b981',
            opacity: 1
          }
        },
        {
          name: 'ภาระงานรวม',
          type: 'line',
          data: [
            ...processedData.historical.map(h => h.workload),
            ...processedData.forecast.map(f => f.workload)
          ],
          lineStyle: {
            color: '#8b5cf6',
            type: 'solid'
          },
          itemStyle: {
            color: '#8b5cf6'
          },
          markArea: processedData.forecast.length > 0 ? {
            data: [[
              {
                xAxis: processedData.historical.length - 1,
                itemStyle: {
                  color: 'rgba(139, 92, 246, 0.1)'
                }
              },
              {
                xAxis: processedData.labels.length - 1
              }
            ]],
            label: {
              show: true,
              position: 'top',
              formatter: 'พยากรณ์'
            }
          } : undefined
        }
      ]
    };

    chart.setOption(option);

    const handleResize = () => chart.resize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.dispose();
    };
  }, [processedData, viewMode, isLoading]);

  // Calculate workload insights
  const insights = useMemo(() => {
    if (processedData.historical.length === 0) return null;

    const recent = processedData.historical.slice(-4); // Last 4 periods
    const avgAssigned = recent.reduce((sum, item) => sum + item.assigned, 0) / recent.length;
    const avgCompleted = recent.reduce((sum, item) => sum + item.completed, 0) / recent.length;
    const avgWorkload = recent.reduce((sum, item) => sum + item.workload, 0) / recent.length;
    
    // Trend analysis
    const firstHalf = processedData.historical.slice(0, Math.floor(processedData.historical.length / 2));
    const secondHalf = processedData.historical.slice(Math.floor(processedData.historical.length / 2));
    
    const firstHalfAvg = firstHalf.reduce((sum, item) => sum + item.workload, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, item) => sum + item.workload, 0) / secondHalf.length;
    
    const trendDirection = secondHalfAvg > firstHalfAvg ? 'increasing' : 
                          secondHalfAvg < firstHalfAvg ? 'decreasing' : 'stable';
    
    const trendPercentage = Math.abs(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100);

    return {
      avgAssigned: Math.round(avgAssigned),
      avgCompleted: Math.round(avgCompleted),
      avgWorkload: Math.round(avgWorkload),
      trendDirection,
      trendPercentage: Math.round(trendPercentage)
    };
  }, [processedData]);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            แนวโน้มภาระงาน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-80 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <BarChart3 className="h-5 w-5 mr-2" />
            แนวโน้มภาระงาน
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'weekly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('weekly')}
            >
              <Calendar className="h-4 w-4 mr-1" />
              รายสัปดาห์
            </Button>
            <Button
              variant={viewMode === 'monthly' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('monthly')}
            >
              <BarChart className="h-4 w-4 mr-1" />
              รายเดือน
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {processedData.historical.length === 0 ? (
          <div className="text-center py-12">
            <BarChart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">ไม่มีข้อมูลสำหรับแสดงกราห</p>
          </div>
        ) : (
          <>
            {/* Chart */}
            <div
              id="workload-chart"
              className="w-full h-80 mb-6"
              style={{ width: '100%', height: '320px' }}
            />

            {/* Insights */}
            {insights && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    {insights.avgAssigned}
                  </div>
                  <div className="text-sm text-gray-600">
                    งานที่ได้รับ/เฉลี่ย
                  </div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600 mb-1">
                    {insights.avgCompleted}
                  </div>
                  <div className="text-sm text-gray-600">
                    งานที่เสร็จ/เฉลี่ย
                  </div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600 mb-1">
                    {insights.avgWorkload}
                  </div>
                  <div className="text-sm text-gray-600">
                    ภาระงานรวม/เฉลี่ย
                  </div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-center mb-1">
                    <TrendingUp 
                      className={`h-6 w-6 mr-1 ${
                        insights.trendDirection === 'increasing' ? 'text-red-600' :
                        insights.trendDirection === 'decreasing' ? 'text-green-600' :
                        'text-gray-600'
                      }`}
                    />
                    <span className={`text-2xl font-bold ${
                      insights.trendDirection === 'increasing' ? 'text-red-600' :
                      insights.trendDirection === 'decreasing' ? 'text-green-600' :
                      'text-gray-600'
                    }`}>
                      {insights.trendPercentage}%
                    </span>
                  </div>
                  <div className="text-sm text-gray-600">
                    แนวโน้ม {
                      insights.trendDirection === 'increasing' ? 'เพิ่มขึ้น' :
                      insights.trendDirection === 'decreasing' ? 'ลดลง' :
                      'คงที่'
                    }
                  </div>
                </div>
              </div>
            )}

            {/* Forecast Legend */}
            {processedData.forecast.length > 0 && (
              <div className="flex items-center justify-center space-x-4 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span className="text-gray-600">ข้อมูลจริง</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 bg-blue-300 rounded"></div>
                  <span className="text-gray-600">พยากรณ์</span>
                </div>
                <Badge variant="outline" className="ml-4">
                  พยากรณ์ {processedData.forecast.length} {viewMode === 'weekly' ? 'สัปดาห์' : 'เดือน'} ข้างหน้า
                </Badge>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkloadChart;