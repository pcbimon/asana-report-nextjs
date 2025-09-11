/**
 * Calendar View Component
 * Displays tasks in a monthly calendar format with colored badges by project/priority
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Subtask } from '../models/asanaReport';

interface CalendarViewProps {
  subtasks: Subtask[];
  isLoading?: boolean;
  userGid?: string;
}

interface CalendarDay {
  date: Date;
  tasks: Subtask[];
  isCurrentMonth: boolean;
  isToday: boolean;
}

interface CalendarWeek {
  days: CalendarDay[];
}

const CalendarView: React.FC<CalendarViewProps> = ({
  subtasks,
  isLoading = false,
  userGid
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Thai month names
  const thaiMonths = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
  ];

  const thaiDays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

  // Generate calendar data
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from the first Sunday of the calendar view
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - startDate.getDay());
    
    // End at the last Saturday of the calendar view
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - endDate.getDay()));
    
    const weeks: CalendarWeek[] = [];
    const currentWeek: CalendarDay[] = [];
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dayTasks = subtasks.filter(task => {
        const taskDate = task.created_at || task.completed_at;
        if (!taskDate) return false;
        
        const taskDateObj = new Date(taskDate);
        return (
          taskDateObj.getFullYear() === date.getFullYear() &&
          taskDateObj.getMonth() === date.getMonth() &&
          taskDateObj.getDate() === date.getDate()
        );
      });

      const today = new Date();
      const isToday = (
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate()
      );

      currentWeek.push({
        date: new Date(date),
        tasks: dayTasks,
        isCurrentMonth: date.getMonth() === month,
        isToday
      });

      if (currentWeek.length === 7) {
        weeks.push({ days: [...currentWeek] });
        currentWeek.length = 0;
      }
    }

    return weeks;
  }, [currentDate, subtasks]);

  // Get priority color
  const getPriorityColor = (priority?: string): string => {
    switch (priority?.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Get project color (hash-based color assignment)
  const getProjectColor = (project?: string): string => {
    if (!project) return 'bg-gray-100 text-gray-800 border-gray-200';
    
    const colors = [
      'bg-blue-100 text-blue-800 border-blue-200',
      'bg-purple-100 text-purple-800 border-purple-200',
      'bg-pink-100 text-pink-800 border-pink-200',
      'bg-indigo-100 text-indigo-800 border-indigo-200',
      'bg-cyan-100 text-cyan-800 border-cyan-200',
      'bg-teal-100 text-teal-800 border-teal-200'
    ];
    
    const hash = project.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Calendar className="h-5 w-5 mr-2" />
            ปฏิทินงาน
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-7 gap-2 mb-4">
              {Array(7).fill(0).map((_, i) => (
                <div key={i} className="h-6 bg-gray-200 rounded"></div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array(35).fill(0).map((_, i) => (
                <div key={i} className="h-24 bg-gray-200 rounded"></div>
              ))}
            </div>
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
            <Calendar className="h-5 w-5 mr-2" />
            ปฏิทินงาน
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              วันนี้
            </Button>
            <Button variant="outline" size="sm" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="text-xl font-semibold text-center">
          {thaiMonths[currentDate.getMonth()]} {currentDate.getFullYear() + 543}
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Header */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {thaiDays.map((day, index) => (
            <div
              key={index}
              className="p-2 text-center text-sm font-medium text-gray-600 border-b"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div className="space-y-2">
          {calendarData.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 gap-2">
              {week.days.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`
                    min-h-24 p-2 border rounded-lg transition-colors hover:bg-gray-50
                    ${day.isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}
                    ${day.isToday ? 'ring-2 ring-blue-500 bg-blue-50' : ''}
                  `}
                >
                  <div className={`
                    text-sm font-medium mb-1
                    ${day.isToday ? 'text-blue-600' : ''}
                  `}>
                    {day.date.getDate()}
                  </div>
                  
                  {/* Task badges */}
                  <div className="space-y-1">
                    {day.tasks.slice(0, 3).map((task, taskIndex) => {
                      const isMyTask = task.assignee?.gid === userGid;
                      const colorClass = task.priority 
                        ? getPriorityColor(task.priority)
                        : getProjectColor(task.project);
                      
                      return (
                        <Badge
                          key={taskIndex}
                          variant="outline"
                          className={`
                            ${colorClass} text-xs px-1 py-0 h-5 truncate block w-full
                            ${isMyTask ? 'ring-1 ring-blue-400' : ''}
                          `}
                          title={`${task.name} ${isMyTask ? '(ของฉัน)' : ''}`}
                        >
                          {task.name.length > 8 ? `${task.name.substring(0, 8)}...` : task.name}
                        </Badge>
                      );
                    })}
                    
                    {/* Show count if more tasks */}
                    {day.tasks.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{day.tasks.length - 3} งาน
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded border ring-1 ring-blue-400"></div>
              <span className="text-gray-600">งานของฉัน</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-red-100 border-red-200"></div>
              <span className="text-gray-600">ความสำคัญสูง</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-yellow-100 border-yellow-200"></div>
              <span className="text-gray-600">ความสำคัญกลาง</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded bg-green-100 border-green-200"></div>
              <span className="text-gray-600">ความสำคัญต่ำ</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-blue-600">
                {subtasks.filter(t => t.assignee?.gid === userGid).length}
              </div>
              <div className="text-xs text-gray-600">งานของฉัน</div>
            </div>
            <div>
              <div className="text-lg font-bold text-green-600">
                {subtasks.filter(t => t.completed).length}
              </div>
              <div className="text-xs text-gray-600">เสร็จสิ้น</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">
                {subtasks.filter(t => t.isOverdue()).length}
              </div>
              <div className="text-xs text-gray-600">เลยกำหนด</div>
            </div>
            <div>
              <div className="text-lg font-bold text-gray-600">
                {subtasks.length}
              </div>
              <div className="text-xs text-gray-600">รวมทั้งหมด</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CalendarView;