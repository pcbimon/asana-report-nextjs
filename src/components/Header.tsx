/**
 * Header component for Individual Dashboard
 * Displays assignee name, refresh button, cache status, and authentication
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Assignee } from '../models/asanaReport';
import { getCacheInfo } from '../lib/supabaseStorage';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { RefreshCw, Settings } from 'lucide-react';
import { getDepartmentDisplayName, UserRoleLevel } from '../types/userRoles';
import { useRouter } from 'next/navigation';
import ExportButtons from './ExportButtons';
import ActionButtons from './ActionButtons';
import {ChevronDown} from './LineIcons'

interface HeaderProps {
  assignee?: Assignee;
  onRefresh?: () => void;
  isLoading?: boolean;
  // Export props
  report?: any;
  assigneeStats?: any;
  subtasks?: any[];
  // Cache info
  cacheInfo?: {
    exists: boolean;
    ageMinutes: number;
    lastUpdated: string;
  } | null;
}

export default function Header({ 
  assignee, 
  onRefresh, 
  isLoading = false,
  report,
  assigneeStats,
  subtasks = [],
  cacheInfo: propCacheInfo
}: HeaderProps) {
  const [cacheInfo, setCacheInfo] = useState<{
    exists: boolean;
    ageMinutes: number;
    lastUpdated: string;
  } | null>(propCacheInfo || null);
  
  const { user, userRole, currentDepartment, signOut } = useAuth();
  const router = useRouter();

  // Update cache info when prop changes
  useEffect(() => {
    if (propCacheInfo) {
      setCacheInfo(propCacheInfo);
    }
  }, [propCacheInfo]);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Left side - Title and assignee info */}
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0">
              <h1 className="text-2xl font-bold text-gray-900">
                Individual Dashboard
              </h1>
              <p className="text-sm text-gray-500 mt-1">
                Asana Report System
              </p>
            </div>
            
          </div>

          {/* Right side - User info, actions, and controls */}
          <div className="flex items-center space-x-4">
            {/* Cache status - updated for read-only mode */}
            {cacheInfo && (
              <div className="hidden lg:flex flex-col items-end text-sm text-gray-500 px-3 py-2 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-1">
                  <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                  <span className="font-medium">ข้อมูลล่าสุด</span>
                </div>
                <span className="text-xs">{cacheInfo.lastUpdated}</span>
                <span className="text-xs text-gray-400">
                  อายุ: {cacheInfo.ageMinutes} นาที
                </span>
                <span className="text-xs text-blue-600">
                  อัพเดตอัตโนมัติทุกวัน 02:00 น.
                </span>
              </div>
            )}

            {/* User profile and authentication */}
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Dropdown trigger + content combined: clicking user area opens menu */}
                <div className="flex items-center">
                  <ActionButtons
                    assignee={assignee}
                    onRefresh={onRefresh}
                    isLoading={isLoading}
                    report={report}
                    assigneeStats={assigneeStats}
                    subtasks={subtasks}
                    userRole={userRole}
                    onSignOut={handleSignOut}
                    triggerAsChild
                    triggerElement={
                      <Button variant="outline" size="sm" asChild>
                        <div className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 focus:outline-none hover:cursor-pointer" aria-label="Open user menu">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-gray-600 text-xs font-medium">{user.email?.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="hidden sm:block text-right">
                            <div className="font-medium text-gray-900">{user.email}</div>
                            {userRole && (
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                <span>{userRole.role_name}</span>
                                {currentDepartment && (
                                  <>
                                    <span>•</span>
                                    <span>{getDepartmentDisplayName(currentDepartment)}</span>
                                  </>
                                )}
                              </div>
                            )}
                          </span>
                          <ChevronDown />
                        </div>
                      </Button>
                    }
                  />
                </div>
              </div>
            ) : (
              /* Not authenticated state */
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <span>ไม่ได้เข้าสู่ระบบ</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push('/login')}
                >
                  เข้าสู่ระบบ
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

/**
 * Loading skeleton for Header component
 */
export function HeaderSkeleton() {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-6">
          <div className="flex items-center space-x-4">
            <div>
              <div className="h-8 w-64 bg-gray-300 rounded animate-pulse"></div>
              <div className="flex items-center space-x-2 mt-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse"></div>
                <div>
                  <div className="h-6 w-32 bg-gray-300 rounded animate-pulse"></div>
                  <div className="h-4 w-48 bg-gray-300 rounded animate-pulse mt-1"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="h-10 w-24 bg-gray-300 rounded animate-pulse"></div>
            <div className="h-10 w-20 bg-gray-300 rounded animate-pulse"></div>
          </div>
        </div>
      </div>
    </header>
  );
}