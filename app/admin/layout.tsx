/**
 * Admin Layout with role-based access control
 * Only accessible to users with ADMIN role level
 */

'use client';

import React from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { UserRoleLevel } from '../../src/types/userRoles';
import { useRouter, usePathname } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Users, Building2, Shield, Settings } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userRole, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังตรวจสอบสิทธิ์...</p>
        </div>
      </div>
    );
  }

  // Check admin access
  if (!userRole || userRole.role_level !== UserRoleLevel.ADMIN) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <Shield className="mx-auto h-16 w-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="text-gray-600 mb-6">
            เฉพาะผู้ดูแลระบบเท่านั้นที่สามารถเข้าถึงหน้านี้ได้
          </p>
          <div className="space-y-3">
            <Button onClick={() => router.push('/dashboard')} className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" />
              กลับไปหน้าแดชบอร์ด
            </Button>
            <p className="text-sm text-gray-500">
              หากคุณควรมีสิทธิ์เข้าถึง กรุณาติดต่อผู้ดูแลระบบ
            </p>
          </div>
        </div>
      </div>
    );
  }

  const navigation = [
    {
      name: 'ภาพรวม',
      href: '/admin',
      icon: Settings,
      current: pathname === '/admin'
    },
    {
      name: 'จัดการผู้ใช้งาน',
      href: '/admin/users',
      icon: Users,
      current: pathname === '/admin/users'
    },
    {
      name: 'จัดการฝ่ายงาน',
      href: '/admin/departments',
      icon: Building2,
      current: pathname === '/admin/departments'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                กลับไปแดชบอร์ด
              </Button>
              <div className="border-l border-gray-200 pl-4">
                <div className="flex items-center space-x-2">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <h1 className="text-xl font-semibold text-gray-900">
                    ระบบจัดการ
                  </h1>
                </div>
                <p className="text-sm text-gray-500">
                  Admin Management System
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{userRole.role_name}</span>
                <span className="mx-1">•</span>
                <span>{userRole.department_name}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-0">
            {navigation.map((item) => {
              const IconComponent = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    item.current
                      ? 'border-blue-500 text-blue-600 bg-blue-50'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <IconComponent className="mr-2 h-4 w-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>
    </div>
  );
}