/**
 * Performance Radar Component
 * Radar chart comparing individual performance with team averages
 */

'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { 
  Target, 
  TrendingUp, 
  Award,
  AlertCircle 
} from 'lucide-react';
import * as echarts from 'echarts';
import { ECharts } from 'echarts';
import { AssigneeStats, TeamAverages } from '../lib/dataProcessor';

interface PerformanceRadarProps {
  assigneeStats?: AssigneeStats;
  teamAverages?: TeamAverages;
  isLoading?: boolean;
}

interface RadarMetric {
  name: string;
  maxValue: number;
  individualValue: number;
  teamAverage: number;
  unit: string;
  higherIsBetter: boolean;
}

const PerformanceRadar: React.FC<PerformanceRadarProps> = ({
  assigneeStats,
  teamAverages,
  isLoading = false
}) => {
  const [chartInstance, setChartInstance] = useState<ECharts | null>(null);

  // Calculate radar metrics
  const radarMetrics = useMemo((): RadarMetric[] => {
    if (!assigneeStats || !teamAverages) return [];

    const metrics: RadarMetric[] = [
      {
        name: 'อัตราความสำเร็จ',
        maxValue: 100,
        individualValue: Math.min(100, assigneeStats.completionRate),
        teamAverage: Math.min(100, teamAverages.averageCompletionRate || 0),
        unit: '%',
        higherIsBetter: true
      },
      {
        name: 'ผลิตภาพ',
        maxValue: Math.max(
          assigneeStats.totalTasks, 
          teamAverages.averageTasksPerWeek || 1,
          10
        ) * 1.2,
        individualValue: assigneeStats.totalTasks,
        teamAverage: teamAverages.averageTasksPerWeek || 0,
        unit: 'งาน',
        higherIsBetter: true
      },
      {
        name: 'งานเสร็จสิ้น',
        maxValue: Math.max(
          assigneeStats.completedTasks,
          teamAverages.averageTasksPerWeek || 1, // Using weekly tasks as approximation
          10
        ) * 1.2,
        individualValue: assigneeStats.completedTasks,
        teamAverage: (teamAverages.averageTasksPerWeek || 0) * (teamAverages.averageCompletionRate || 0) / 100,
        unit: 'งาน',
        higherIsBetter: true
      },
      {
        name: 'การจัดการเวลา',
        maxValue: 100,
        individualValue: assigneeStats.overdueTasks === 0 ? 100 : 
          Math.max(0, 100 - (assigneeStats.overdueTasks / assigneeStats.totalTasks) * 100),
        teamAverage: 80, // Default baseline since we don't have team overdue data
        unit: '%',
        higherIsBetter: true
      },
      {
        name: 'ความสม่ำเสมอ',
        maxValue: 100,
        individualValue: calculateConsistencyScore(assigneeStats.weeklyData),
        teamAverage: 70, // Default baseline since we don't have this data
        unit: '%',
        higherIsBetter: true
      },
      {
        name: 'ความรวดเร็ว',
        maxValue: 100,
        individualValue: calculateSpeedScore(assigneeStats.averageTimePerTask, teamAverages.averageTimePerTask),
        teamAverage: 50, // Baseline for team average
        unit: '%',
        higherIsBetter: true
      }
    ];

    return metrics;
  }, [assigneeStats, teamAverages]);

  // Calculate consistency score based on weekly data variance
  const calculateConsistencyScore = (weeklyData: any[]): number => {
    if (!weeklyData || weeklyData.length < 2) return 50;
    
    const completedTasks = weeklyData.map(w => w.completed);
    const average = completedTasks.reduce((sum, val) => sum + val, 0) / completedTasks.length;
    
    if (average === 0) return 50;
    
    const variance = completedTasks.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / completedTasks.length;
    const standardDeviation = Math.sqrt(variance);
    const coefficient = standardDeviation / average;
    
    // Convert coefficient to score (lower variance = higher score)
    return Math.max(0, Math.min(100, 100 - (coefficient * 50)));
  };

  // Calculate speed score comparing individual vs team average time per task
  const calculateSpeedScore = (individualTime?: number, teamTime?: number): number => {
    if (!individualTime || !teamTime || teamTime === 0) return 50;
    
    // If individual is faster than team average, score > 50
    // If individual is slower than team average, score < 50
    const ratio = teamTime / individualTime;
    return Math.max(0, Math.min(100, ratio * 50));
  };

  // Calculate overall performance score
  const overallScore = useMemo(() => {
    if (radarMetrics.length === 0) return 0;
    
    const totalScore = radarMetrics.reduce((sum, metric) => {
      const normalizedIndividual = (metric.individualValue / metric.maxValue) * 100;
      return sum + normalizedIndividual;
    }, 0);
    
    return Math.round(totalScore / radarMetrics.length);
  }, [radarMetrics]);

  // Get performance level
  const getPerformanceLevel = (score: number) => {
    if (score >= 80) return { label: 'ยอดเยี่ยม', color: 'text-green-600', bgColor: 'bg-green-50' };
    if (score >= 65) return { label: 'ดี', color: 'text-blue-600', bgColor: 'bg-blue-50' };
    if (score >= 50) return { label: 'ปานกลาง', color: 'text-yellow-600', bgColor: 'bg-yellow-50' };
    return { label: 'ต้องปรับปรุง', color: 'text-red-600', bgColor: 'bg-red-50' };
  };

  // Initialize radar chart
  React.useEffect(() => {
    const chartElement = document.getElementById('performance-radar-chart');
    if (!chartElement || isLoading || radarMetrics.length === 0) return;

    const chart = echarts.init(chartElement);
    setChartInstance(chart);

    const option: echarts.EChartsOption = {
      title: {
        text: 'การเปรียบเทียบประสิทธิภาพ',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'item',
        formatter: (params: any) => {
          const metric = radarMetrics[params.dimensionIndex];
          const isIndividual = params.seriesName === 'ของฉัน';
          const value = isIndividual ? metric.individualValue : metric.teamAverage;
          
          return `
            ${params.seriesName}<br/>
            ${metric.name}: ${value.toFixed(1)} ${metric.unit}
          `;
        }
      },
      legend: {
        data: ['ของฉัน', 'เฉลี่ยทีม'],
        top: 30
      },
      radar: {
        indicator: radarMetrics.map(metric => ({
          name: metric.name,
          max: metric.maxValue,
          axisLabel: {
            show: false
          }
        })),
        center: ['50%', '55%'],
        radius: '65%',
        startAngle: 90,
        splitNumber: 4,
        shape: 'circle',
        axisName: {
          color: '#666',
          fontSize: 12
        },
        splitArea: {
          areaStyle: {
            color: ['rgba(59, 130, 246, 0.05)', 'rgba(59, 130, 246, 0.1)']
          }
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(59, 130, 246, 0.3)'
          }
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(59, 130, 246, 0.3)'
          }
        }
      },
      series: [
        {
          name: 'ของฉัน',
          type: 'radar',
          data: [
            {
              value: radarMetrics.map(metric => metric.individualValue),
              name: 'ของฉัน',
              itemStyle: {
                color: '#3b82f6'
              },
              areaStyle: {
                color: 'rgba(59, 130, 246, 0.3)'
              }
            }
          ]
        },
        {
          name: 'เฉลี่ยทีม',
          type: 'radar',
          data: [
            {
              value: radarMetrics.map(metric => metric.teamAverage),
              name: 'เฉลี่ยทีม',
              itemStyle: {
                color: '#10b981'
              },
              areaStyle: {
                color: 'rgba(16, 185, 129, 0.2)'
              }
            }
          ]
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
  }, [radarMetrics, isLoading]);

  const performanceLevel = getPerformanceLevel(overallScore);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            การเปรียบเทียบประสิทธิภาพ
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

  if (radarMetrics.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Target className="h-5 w-5 mr-2" />
            การเปรียบเทียบประสิทธิภาพ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">ไม่มีข้อมูลสำหรับเปรียบเทียบประสิทธิภาพ</p>
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
            <Target className="h-5 w-5 mr-2" />
            การเปรียบเทียบประสิทธิภาพ
          </CardTitle>
          <div className={`px-3 py-1 rounded-full ${performanceLevel.bgColor}`}>
            <span className={`text-sm font-medium ${performanceLevel.color}`}>
              {performanceLevel.label}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Overall Score */}
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-2">
            <Award className={`h-8 w-8 mr-2 ${performanceLevel.color}`} />
            <span className={`text-3xl font-bold ${performanceLevel.color}`}>
              {overallScore}
            </span>
            <span className="text-xl text-gray-500 ml-1">/100</span>
          </div>
          <p className="text-gray-600">คะแนนประสิทธิภาพรวม</p>
        </div>

        {/* Radar Chart */}
        <div
          id="performance-radar-chart"
          className="w-full h-80 mb-6"
          style={{ width: '100%', height: '320px' }}
        />

        {/* Detailed Metrics */}
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 mb-3">รายละเอียดตัวชี้วัด</h4>
          {radarMetrics.map((metric, index) => {
            const individualPercent = (metric.individualValue / metric.maxValue) * 100;
            const teamPercent = (metric.teamAverage / metric.maxValue) * 100;
            const isAboveAverage = metric.individualValue > metric.teamAverage;
            
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">{metric.name}</span>
                    <div className="flex items-center space-x-2">
                      {isAboveAverage ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                      )}
                      <Badge variant={isAboveAverage ? "default" : "secondary"}>
                        {isAboveAverage ? 'เหนือค่าเฉลี่ย' : 'ต่ำกว่าค่าเฉลี่ย'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4 text-xs">
                    <div className="flex items-center space-x-1">
                      <span className="text-blue-600">ของฉัน:</span>
                      <span className="font-medium">
                        {metric.individualValue.toFixed(1)} {metric.unit}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <span className="text-green-600">ทีม:</span>
                      <span className="font-medium">
                        {metric.teamAverage.toFixed(1)} {metric.unit}
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 relative">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full relative"
                        style={{ width: `${Math.min(100, individualPercent)}%` }}
                      />
                      <div
                        className="absolute top-0 w-1 h-2 bg-green-600 rounded-full"
                        style={{ left: `${Math.min(100, teamPercent)}%` }}
                        title={`เฉลี่ยทีม: ${metric.teamAverage.toFixed(1)} ${metric.unit}`}
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Performance Insights */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">สรุปการประเมิน</h4>
          <div className="text-sm text-blue-800 space-y-1">
            {overallScore >= 80 && (
              <p>• ประสิทธิภาพการทำงานอยู่ในระดับยอดเยี่ยม คงความสามารถนี้ต่อไป</p>
            )}
            {overallScore >= 65 && overallScore < 80 && (
              <p>• ประสิทธิภาพการทำงานอยู่ในระดับดี สามารถพัฒนาต่อไปเพื่อความเป็นเลิศ</p>
            )}
            {overallScore >= 50 && overallScore < 65 && (
              <p>• ประสิทธิภาพการทำงานอยู่ในระดับปานกลาง ควรมุ่งเน้นการพัฒนาจุดที่ยังอ่อน</p>
            )}
            {overallScore < 50 && (
              <p>• ประสิทธิภาพการทำงานต้องการการปรับปรุง แนะนำให้ขอคำปรึกษาจากหัวหน้าทีม</p>
            )}
            
            {radarMetrics.filter(m => m.individualValue > m.teamAverage).length > 0 && (
              <p>
                • จุดแข็ง: {radarMetrics
                  .filter(m => m.individualValue > m.teamAverage)
                  .map(m => m.name)
                  .join(', ')}
              </p>
            )}
            
            {radarMetrics.filter(m => m.individualValue < m.teamAverage).length > 0 && (
              <p>
                • จุดที่ควรพัฒนา: {radarMetrics
                  .filter(m => m.individualValue < m.teamAverage)
                  .map(m => m.name)
                  .join(', ')}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PerformanceRadar;