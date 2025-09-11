/**
 * Filters Panel Component
 * Advanced filtering with time-range, project, status, priority
 * Persists filters in URL query params
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Filter, X, Calendar, Search, RotateCcw } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

export interface FilterOptions {
  searchQuery: string;
  status: 'all' | 'completed' | 'pending' | 'overdue';
  priority: 'all' | 'high' | 'medium' | 'low' | 'none';
  project: string; // 'all' or specific project name
  dateRange: {
    startDate: string;
    endDate: string;
  };
  assigneeType: 'all' | 'mine' | 'others';
}

interface FiltersResponse {
  filters: FilterOptions;
  activeFiltersCount: number;
}

interface FiltersPanelProps {
  onFiltersChange: (filters: FilterOptions) => void;
  projects: string[];
  isLoading?: boolean;
  defaultFilters?: Partial<FilterOptions>;
}

const defaultFilterOptions: FilterOptions = {
  searchQuery: '',
  status: 'all',
  priority: 'all',
  project: 'all',
  dateRange: {
    startDate: '',
    endDate: ''
  },
  assigneeType: 'all'
};

const FiltersPanel: React.FC<FiltersPanelProps> = ({
  onFiltersChange,
  projects,
  isLoading = false,
  defaultFilters = {}
}) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Initialize filters from URL params or defaults
  const [filters, setFilters] = useState<FilterOptions>(() => {
    const initialFilters = { ...defaultFilterOptions, ...defaultFilters };
    
    // Read from URL params
    const urlSearchQuery = searchParams.get('search');
    const urlStatus = searchParams.get('status');
    const urlPriority = searchParams.get('priority');
    const urlProject = searchParams.get('project');
    const urlStartDate = searchParams.get('startDate');
    const urlEndDate = searchParams.get('endDate');
    const urlAssigneeType = searchParams.get('assigneeType');
    
    if (urlSearchQuery || urlStatus || urlPriority || urlProject || urlStartDate || urlEndDate || urlAssigneeType) {
      return {
        searchQuery: urlSearchQuery || initialFilters.searchQuery,
        status: (urlStatus as any) || initialFilters.status,
        priority: (urlPriority as any) || initialFilters.priority,
        project: urlProject || initialFilters.project,
        dateRange: {
          startDate: urlStartDate || initialFilters.dateRange.startDate,
          endDate: urlEndDate || initialFilters.dateRange.endDate
        },
        assigneeType: (urlAssigneeType as any) || initialFilters.assigneeType
      };
    }
    
    return initialFilters;
  });

  // Update URL params when filters change
  const updateUrlParams = (newFilters: FilterOptions) => {
    const params = new URLSearchParams();
    
    if (newFilters.searchQuery) params.set('search', newFilters.searchQuery);
    if (newFilters.status !== 'all') params.set('status', newFilters.status);
    if (newFilters.priority !== 'all') params.set('priority', newFilters.priority);
    if (newFilters.project !== 'all') params.set('project', newFilters.project);
    if (newFilters.dateRange.startDate) params.set('startDate', newFilters.dateRange.startDate);
    if (newFilters.dateRange.endDate) params.set('endDate', newFilters.dateRange.endDate);
    if (newFilters.assigneeType !== 'all') params.set('assigneeType', newFilters.assigneeType);
    
    // Update URL without page reload
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.push(newUrl, { scroll: false });
  };

  // Handle filter changes
  const handleFilterChange = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFiltersChange(newFilters);
    updateUrlParams(newFilters);
  };

  // Handle date range changes
  const handleDateRangeChange = (key: 'startDate' | 'endDate', value: string) => {
    const newDateRange = { ...filters.dateRange, [key]: value };
    const newFilters = { ...filters, dateRange: newDateRange };
    setFilters(newFilters);
    onFiltersChange(newFilters);
    updateUrlParams(newFilters);
  };

  // Reset all filters
  const resetFilters = () => {
    const resetFilters = { ...defaultFilterOptions, ...defaultFilters };
    setFilters(resetFilters);
    onFiltersChange(resetFilters);
    router.push(window.location.pathname, { scroll: false });
  };

  // Count active filters
  const getActiveFiltersCount = (): number => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.status !== 'all') count++;
    if (filters.priority !== 'all') count++;
    if (filters.project !== 'all') count++;
    if (filters.dateRange.startDate || filters.dateRange.endDate) count++;
    if (filters.assigneeType !== 'all') count++;
    return count;
  };

  // Quick filter buttons
  const quickFilters = [
    { label: 'งานของฉัน', key: 'assigneeType' as const, value: 'mine' },
    { label: 'เลยกำหนด', key: 'status' as const, value: 'overdue' },
    { label: 'เสร็จแล้ว', key: 'status' as const, value: 'completed' },
    { label: 'ความสำคัญสูง', key: 'priority' as const, value: 'high' }
  ];

  // Auto-expand if there are active filters
  useEffect(() => {
    if (getActiveFiltersCount() > 0) {
      setIsExpanded(true);
    }
  }, []);

  const activeFiltersCount = getActiveFiltersCount();

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-4">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array(4).fill(0).map((_, i) => (
                <div key={i} className="h-10 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-lg">
            <Filter className="h-5 w-5 mr-2" />
            ตัวกรองข้อมูล
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center space-x-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={resetFilters}
                className="text-xs"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                ล้างทั้งหมด
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'ซ่อน' : 'แสดง'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Quick Filters - Always visible */}
        <div className="flex flex-wrap gap-2 mb-4">
          {quickFilters.map((quickFilter) => {
            const isActive = filters[quickFilter.key] === quickFilter.value;
            return (
              <Button
                key={quickFilter.label}
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  const newValue = isActive ? 'all' : quickFilter.value;
                  handleFilterChange(quickFilter.key, newValue);
                }}
                className="text-xs"
              >
                {quickFilter.label}
                {isActive && <X className="h-3 w-3 ml-1" />}
              </Button>
            );
          })}
        </div>

        {/* Advanced Filters - Expandable */}
        {isExpanded && (
          <div className="space-y-4 border-t pt-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search" className="text-sm font-medium">
                ค้นหาชื่องาน
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="พิมพ์ชื่องาน..."
                  value={filters.searchQuery}
                  onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">สถานะ</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="completed">เสร็จสิ้น</SelectItem>
                    <SelectItem value="pending">อยู่ระหว่างดำเนินการ</SelectItem>
                    <SelectItem value="overdue">เลยกำหนด</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Priority Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">ความสำคัญ</Label>
                <Select
                  value={filters.priority}
                  onValueChange={(value) => handleFilterChange('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="high">สูง</SelectItem>
                    <SelectItem value="medium">กลาง</SelectItem>
                    <SelectItem value="low">ต่ำ</SelectItem>
                    <SelectItem value="none">ไม่ระบุ</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Project Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">โครงการ</Label>
                <Select
                  value={filters.project}
                  onValueChange={(value) => handleFilterChange('project', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project} value={project}>
                        {project}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Assignee Type Filter */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">ประเภทผู้รับผิดชอบ</Label>
                <Select
                  value={filters.assigneeType}
                  onValueChange={(value) => handleFilterChange('assigneeType', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทั้งหมด</SelectItem>
                    <SelectItem value="mine">งานของฉัน</SelectItem>
                    <SelectItem value="others">งานของคนอื่น</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                ช่วงเวลา
              </Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate" className="text-xs text-gray-600">
                    วันที่เริ่มต้น
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filters.dateRange.startDate}
                    onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-xs text-gray-600">
                    วันที่สิ้นสุด
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filters.dateRange.endDate}
                    onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Summary */}
        {activeFiltersCount > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <span>ตัวกรองที่ใช้:</span>
              <div className="flex flex-wrap gap-1">
                {filters.searchQuery && (
                  <Badge variant="secondary" className="text-xs">
                    ค้นหา: {filters.searchQuery}
                  </Badge>
                )}
                {filters.status !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    สถานะ: {filters.status}
                  </Badge>
                )}
                {filters.priority !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    ความสำคัญ: {filters.priority}
                  </Badge>
                )}
                {filters.project !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    โครงการ: {filters.project}
                  </Badge>
                )}
                {filters.assigneeType !== 'all' && (
                  <Badge variant="secondary" className="text-xs">
                    ประเภท: {filters.assigneeType}
                  </Badge>
                )}
                {(filters.dateRange.startDate || filters.dateRange.endDate) && (
                  <Badge variant="secondary" className="text-xs">
                    วันที่: {filters.dateRange.startDate || '?'} - {filters.dateRange.endDate || '?'}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default FiltersPanel;