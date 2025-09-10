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
import { RefreshCw, Download } from 'lucide-react';

interface HeaderProps {
  assignee?: Assignee;
  onRefresh?: () => void;
  isLoading?: boolean;
}

export default function Header({ assignee, onRefresh, isLoading = false }: HeaderProps) {
  const [cacheInfo, setCacheInfo] = useState<{
    exists: boolean;
    ageMinutes: number;
    lastUpdated: string;
  } | null>(null);
  
  const { user, signOut } = useAuth();

  // Load cache info
  useEffect(() => {
    const loadCacheInfo = async () => {
      try {
        const info = await getCacheInfo();
        setCacheInfo(info);
      } catch (error) {
        console.error('Error loading cache info:', error);
      }
    };

    loadCacheInfo();
    
    // Refresh cache info every minute
    const interval = setInterval(loadCacheInfo, 60000);
    return () => clearInterval(interval);
  }, []);

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
        <div className="flex justify-between items-center py-6">
          {/* Left side - Title and assignee info */}
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Individual Dashboard
              </h1>
              {assignee && (
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {assignee.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-lg font-medium text-gray-700">
                      {assignee.name}
                    </p>
                    {assignee.email && (
                      <p className="text-sm text-gray-500">
                        {assignee.email}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Actions and status */}
          <div className="flex items-center space-x-4">
            {/* Cache status */}
            {cacheInfo && (
              <div className="hidden sm:block text-sm text-gray-500">
                <div className="flex flex-col items-end">
                  <span>Last updated: {cacheInfo.lastUpdated}</span>
                  <span className="text-xs">
                    Cache: {cacheInfo.ageMinutes}m old
                  </span>
                </div>
              </div>
            )}

            {/* User info and signout */}
            {user && (
              <div className="flex items-center space-x-2">
                <div className="hidden sm:block text-sm text-gray-700">
                  <span>Signed in as: </span>
                  <span className="font-medium">{user.email}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </div>
            )}

            {/* Refresh button */}
            <Button
              onClick={onRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refresh Data
                </>
              )}
            </Button>

            {/* Export button */}
            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
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