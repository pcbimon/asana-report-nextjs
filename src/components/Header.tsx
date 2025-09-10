/**
 * Header component for Individual Dashboard
 * Displays assignee name, refresh button, cache status, and authentication
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Assignee } from '../models/asanaReport';
import { getCacheInfo } from '../lib/supabaseStorage';
import { useAuth } from '../contexts/AuthContext';

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
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
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
                <button
                  onClick={handleSignOut}
                  className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Sign Out
                </button>
              </div>
            )}

            {/* Refresh button */}
            <button
              onClick={onRefresh}
              disabled={isLoading}
              className={`
                inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md
                ${isLoading 
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }
                transition-colors duration-200
              `}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Refreshing...
                </>
              ) : (
                <>
                  <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Refresh Data
                </>
              )}
            </button>

            {/* Export dropdown (placeholder) */}
            <div className="relative">
              <button
                type="button"
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="-ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Export
                <svg className="ml-2 -mr-1 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
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