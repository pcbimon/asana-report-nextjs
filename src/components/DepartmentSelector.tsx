/**
 * Department Selector Component
 * Allows users with multiple department access to switch between departments
 */

'use client';

import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '../../components/ui/select';
import { UserDepartment, getDepartmentDisplayName, formatUserRoleWithDepartment } from '../types/userRoles';

interface DepartmentSelectorProps {
  departments: UserDepartment[];
  currentDepartment: UserDepartment | null;
  onDepartmentChange: (department: UserDepartment) => void;
  className?: string;
}

export default function DepartmentSelector({
  departments,
  currentDepartment,
  onDepartmentChange,
  className = ''
}: DepartmentSelectorProps) {
  // Don't show selector if user has only one department
  if (departments.length <= 1) {
    return null;
  }

  const handleValueChange = (departmentId: string) => {
    const selectedDepartment = departments.find(dept => dept.department_id.toString() === departmentId);
    if (selectedDepartment) {
      onDepartmentChange(selectedDepartment);
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-medium text-gray-900">เลือกฝ่ายงาน</h2>
          <p className="text-xs text-gray-600 mt-1">
            คุณมีสิทธิ์เข้าถึงข้อมูลหลายฝ่ายงาน
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Select
            value={currentDepartment?.department_id.toString() || ''}
            onValueChange={handleValueChange}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="เลือกฝ่ายงาน..." />
            </SelectTrigger>
            <SelectContent>
              {departments.map(department => (
                <SelectItem 
                  key={department.department_id} 
                  value={department.department_id.toString()}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">
                      {getDepartmentDisplayName(department)}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatUserRoleWithDepartment(department.role_name, '')}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-xs text-gray-500">
            {departments.length} ฝ่าย
          </div>
        </div>
      </div>
      
      {/* Current Department Info */}
      {currentDepartment && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-gray-600">ฝ่ายงานปัจจุบัน:</span>
              <span className="ml-2 font-medium text-gray-900">
                {getDepartmentDisplayName(currentDepartment)}
              </span>
            </div>
            <div>
              <span className="text-gray-600">ตำแหน่ง:</span>
              <span className="ml-2 font-medium text-blue-600">
                {currentDepartment.role_name}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Simple Department Badge Component
 * Shows current department in a compact format
 */
export function DepartmentBadge({ 
  department, 
  className = '' 
}: { 
  department: UserDepartment | null; 
  className?: string; 
}) {
  if (!department) {
    return null;
  }

  return (
    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 ${className}`}>
      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M6 6V5a3 3 0 013-3h2a3 3 0 013 3v1h2a2 2 0 012 2v3.57A22.952 22.952 0 0110 13a22.95 22.95 0 01-8-1.43V8a2 2 0 012-2h2zm2-1a1 1 0 011-1h2a1 1 0 011 1v1H8V5zm1 5a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" />
      </svg>
      {getDepartmentDisplayName(department)}
    </div>
  );
}