/**
 * Admin Layout with role-based access control
 * Only accessible to users with ADMIN role level
 */

'use client';

import React from 'react';
import { useAuth } from '../../src/contexts/AuthContext';
import { UserRoleLevel } from '../../src/types/userRoles';
import { useRouter } from 'next/navigation';
import { Button } from '../../components/ui/button';
import { ArrowLeft, Users, Building2, Shield } from 'lucide-react';
import Link from 'next/link';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userRole, isLoading } = useAuth();
  const router = useRouter();

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
          <Button onClick={() => router.push('/dashboard')} className="w-full">
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับไปหน้าแดชบอร์ด
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Button
                variant="ghost"
                onClick={() => router.push('/dashboard')}
                className="mr-4"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                กลับไปแดชบอร์ด
              </Button>
              <h1 className="text-xl font-semibold text-gray-900">
                ระบบจัดการ
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {userRole.role_name} - {userRole.department_name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8">
            <Link
              href="/admin/users"
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-blue-500 hover:text-blue-600"
            >
              <Users className="mr-2 h-4 w-4" />
              จัดการผู้ใช้งาน
            </Link>
            <Link
              href="/admin/departments"
              className="flex items-center px-3 py-2 text-sm font-medium text-gray-900 border-b-2 border-transparent hover:border-blue-500 hover:text-blue-600"
            >
              <Building2 className="mr-2 h-4 w-4" />
              จัดการฝ่ายงาน
            </Link>
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